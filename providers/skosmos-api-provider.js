const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("../utils/lodash")
const errors = require("../errors")

/**
 * Skosmos API.
 *
 * [Skosmos](http://skosmos.org/) is a web application to publish SKOS-based vocabularies.
 * This class provides access to a Skosmos instance via its REST API.
 *
 * To use it in a registry, specify `provider` as "SkosmosApi" and provide the API base URL as `api`:
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/skosmos-zbw",
 *  "provider": "SkosmosApi",
 *  "api": "https://zbw.eu/beta/skosmos/rest/v1/",
 *  "schemes": [
 *    {
 *      "uri": "http://bartoc.org/en/node/313",
 *      "VOCID": "stw"
 *    }
 *  ]
 * }
 * ```
 *
 * Currently, it is not possible to query a list of concept schemes from the API, so you need to provide this list including a `VOCID` for every scheme.
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
class SkosmosApiProvider extends BaseProvider {

  /**
   * @private
   */
  _setup() {
    this.has.schemes = true
    this.has.top = false
    this.has.data = true
    this.has.concepts = true
    this.has.narrower = true
    this.has.ancestors = true
    this.has.types = true // ?
    this.has.suggest = true
    this.has.search = true
    // Set concepts and topConcepts for schemes
    for (let scheme of this.schemes) {
      scheme.concepts = [null]
      scheme.topConcepts = []
    }
  }

  /**
   * @private
   */
  _getApiUrl(scheme, endpoint, params) {
    if (!scheme || !scheme.VOCID) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme or VOCID property on scheme" })
    }
    endpoint = endpoint || ""
    params = params || {}
    if (!params.lang) {
      params.lang = this.languages[0] || "en"
    }
    const paramString = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&")
    return `${this._api.api}${scheme.VOCID}${endpoint}${paramString ? "?" + paramString : ""}`
  }

  /**
   * @private
   */
  _getDataUrl(concept, { addFormatParameter = true } = {}) {
    const scheme = _.get(concept, "inScheme[0]")
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept", message: "Missing concept URI" })
    }
    return this._getApiUrl(scheme, "/data", addFormatParameter ? { format: "application/json" } : {})
  }

  /**
   * @private
   */
  _toJskosConcept(skosmosConcept, { concept, scheme, result, language } = {}) {
    if (!skosmosConcept) {
      return null
    }
    concept = jskos.deepCopy(concept || {})
    language = language || skosmosConcept.lang || "en"

    concept.uri = skosmosConcept.uri

    // Set inScheme
    if (scheme) {
      concept.inScheme = [scheme]
    }

    // Set prefLabel
    let prefLabel = skosmosConcept.matchedPrefLabel || skosmosConcept.prefLabel || skosmosConcept.label
    if (_.isString(prefLabel)) {
      _.set(concept, `prefLabel.${language}`, prefLabel)
    } else {
      if (prefLabel && !_.isArray(prefLabel)) {
        prefLabel = [prefLabel]
      }
      for (let label of prefLabel || []) {
        _.set(concept, `prefLabel.${label.lang}`, label.value)
      }
    }

    // Set altLabel
    let altLabel = skosmosConcept.altLabel
    if (_.isString(altLabel)) {
      _.set(concept, `altLabel.${language}`, [altLabel])
    } else {
      if (altLabel && !_.isArray(altLabel)) {
        altLabel = [altLabel]
      }
      for (let label of altLabel || []) {
        if (_.get(concept, `altLabel.${label.lang}`)) {
          concept.altLabel[label.lang].push(label.value)
          concept.altLabel[label.lang] = _.uniq(concept.altLabel[label.lang])
        } else {
          _.set(concept, `altLabel.${label.lang}`, [label.value])
        }
      }
    }

    // Set notation
    const notation = skosmosConcept.notation || skosmosConcept["skos:notation"] || jskos.notation(concept)
    if (notation) {
      // notation can be string or object, so we're trying notation.value first
      concept.notation = [notation.value || notation]
    }

    // Set narrower
    if (skosmosConcept.hasChildren === true) {
      concept.narrower = [null]
    } else if (skosmosConcept.hasChildren === false) {
      concept.narrower = []
    }

    // Set type
    if (skosmosConcept.type && !_.isArray(skosmosConcept.type)) {
      skosmosConcept.type = [skosmosConcept.type]
    }
    concept.type = concept.type || []
    for (let type of skosmosConcept.type || []) {
      if (!jskos.isValidUri(type)) {
        continue
      }
      const uriScheme = type.slice(0, type.indexOf(":"))
      // Try to find uriScheme in @context
      if (result && result["@context"] && result["@context"][uriScheme]) {
        type = type.replace(uriScheme + ":", result["@context"][uriScheme])
      }
      concept.type.push(type)
    }
    concept.type = _.uniq(concept.type)
    if (!concept.type.length) {
      concept.type = ["http://www.w3.org/2004/02/skos/core#Concept"]
    }

    return concept
  }

  /**
   * Returns all concept schemes.
   *
   * @param {Object} config
   * @returns {Object[]} array of JSKOS concept scheme objects
   */
  async getSchemes({ ...config }) {
    // TODO: Re-evaluate!
    if (!this._jskos.loadSchemeInfo) {
      const result = this.schemes.map(s => jskos.deepCopy(s))
      return result
    }
    const schemes = []
    // TODO
    const language = this.languages[0] || "en"
    for (let scheme of this.schemes || []) {
      const url = this._getApiUrl(scheme, "/", { lang: language })
      const data = await this.axios({
        ...config,
        method: "get",
        url,
      })
      const resultScheme = data.conceptschemes.find(s => jskos.compare(s, scheme))
      const label = resultScheme && (resultScheme.prefLabel || resultScheme.label || resultScheme.title)
      if (label) {
        _.set(scheme, `prefLabel.${language}`, label)
      }
      // TODO: If there is no label, redo the request with one of the available languages.
      schemes.push(scheme)
    }
    return schemes
  }

  /**
   * Returns top concepts.
   *
   * @param {Object} config
   * @param {Object} config.scheme concept scheme
   * @returns {Object[]} array of JSKOS concept scheme objects
   */
  async getTop({ scheme, ...config }) {
    const url = this._getApiUrl(scheme, "/topConcepts")
    const language = this.languages[0] || "en"
    _.set(config, "params.lang", language)
    _.set(config, "params.scheme", scheme.uri)
    const response = await this.axios({
      ...config,
      method: "get",
      url,
    })
    const concepts = []
    for (let concept of response.topconcepts || []) {
      const newConcept = this._toJskosConcept(concept, {
        scheme,
        language,
      })
      newConcept.topConceptOf = [scheme]
      concepts.push(newConcept)
    }
    return concepts
  }

  /**
   * Returns details for a list of concepts.
   *
   * @param {Object} config
   * @param {Object[]} config.concepts list of concept objects to load
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getConcepts({ concepts, ...config }) {
    if (!_.isArray(concepts)) {
      concepts = [concepts]
    }
    concepts = concepts.map(c => ({ uri: c.uri, inScheme: c.inScheme }))
    const newConcepts = []
    for (let concept of concepts) {
      const url = this._getDataUrl(concept, { addFormatParameter: false })
      if (!url) {
        continue
      }
      const result = await this.axios({
        ...config,
        method: "get",
        url,
        params: {
          uri: concept.uri,
          format: "application/json",
        },
      })
      const resultConcept = result && result.graph && result.graph.find(c => jskos.compare(c, concept))
      if (resultConcept) {
        const newConcept = this._toJskosConcept(resultConcept, { concept, result })
        // Set broader/narrower
        for (let type of ["broader", "narrower"]) {
          let relatives = resultConcept[type] || newConcept[type]
          if (relatives && !_.isArray(relatives)) {
            relatives = [relatives]
          }
          if (!relatives) {
            relatives = []
          }
          newConcept[type] = relatives.map(r => this._toJskosConcept(result.graph.find(c => jskos.compare(c, r)), { scheme: concept.inScheme[0], result }))
          // if (relatives.length) {
          //   newConcept[type] = [null]
          // } else {
          //   newConcept[type] = []
          // }
        }
        // Set ancestors to empty array
        // ?
        newConcept.ancestors = []
        // Push to array
        newConcepts.push(newConcept)
      }
    }
    return newConcepts
  }

  /**
   * Returns narrower concepts for a concept.
   *
   * @param {Object} config
   * @param {Object} config.concept concept object
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getNarrower({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    const scheme = concept.inScheme[0]
    const url = this._getApiUrl(scheme, "/children")
    _.set(config, "params.uri", concept.uri)
    const response = await this.axios({
      ...config,
      method: "get",
      url,
    })
    const concepts = (response.narrower || []).map(c => this._toJskosConcept(c, { scheme }))
    return concepts
  }

  /**
   * Returns ancestor concepts for a concept.
   *
   * @param {Object} config
   * @param {Object} config.concept concept object
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getAncestors({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    const scheme = concept.inScheme[0]
    const url = this._getApiUrl(scheme, "/broaderTransitive")
    _.set(config, "params.uri", concept.uri)
    const response = await this.axios({
      ...config,
      method: "get",
      url,
    })
    let ancestors = []
    let uri = concept.uri
    while (uri) {
      if (uri != concept.uri) {
        ancestors = [{ uri }].concat(ancestors)
      }
      uri = _.get(response, `broaderTransitive["${uri}"].broader[0]`)
    }
    const concepts = ancestors.map(c => this._toJskosConcept(c, { scheme })).filter(c => c.uri != concept.uri)
    return concepts
  }

  /**
   * Returns suggestion result in OpenSearch Suggest Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} [config.scheme] concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {string[]} [config.types=[]] list of type URIs
   * @returns {Array} result in OpenSearch Suggest Format
   */
  async suggest(config) {
    config._raw = true
    const concepts = await this.search(config)
    const result = [config.search, [], [], []]
    for (let concept of concepts) {
      const notation = jskos.notation(concept)
      const label = jskos.prefLabel(concept)
      result[1].push((notation ? notation + " " : "") + label)
      result[2].push("")
      result[3].push(concept.uri)
    }
    if (concepts._totalCount != undefined) {
      result._totalCount = concepts._totalCount
    } else {
      result._totalCount = concepts.length
    }
    return result
  }

  /**
   * Returns concept search results.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} [config.scheme] concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {string[]} [config.types=[]] list of type URIs
   * @returns {Array} array of JSKOS concept objects
   */
  async search({ search, scheme, limit, types = [], ...config }) {
    const url = this._getApiUrl(scheme, "/search")
    _.set(config, "params.query", `${search}*`)
    _.set(config, "params.unique", 1)
    _.set(config, "params.maxhits", limit || 100)
    _.set(config, "params.type", types.join(" "))
    const response = await this.axios({
      ...config,
      method: "get",
      url,
    })
    const concepts = (response.results || []).map(c => this._toJskosConcept(c))
    return concepts
  }

  /**
   * Returns a list of types.
   *
   * @param {Object} config
   * @param {Object} [config.scheme] concept scheme to load types for
   * @returns {Object[]} array of JSKOS type objects
   */
  async getTypes({ scheme, ...config }) {
    const url = this._getApiUrl(scheme, "/types")
    const types = []
    const response = await this.axios({
      ...config,
      method: "get",
      url,
    })
    for (let type of (response && response.types) || []) {
      // Skip SKOS type Concept
      if (type.uri == "http://www.w3.org/2004/02/skos/core#Concept") {
        continue
      }
      // Set prefLabel if available
      if (type.label) {
        type.prefLabel = {
          [response["@context"]["@language"]]: type.label,
        }
        delete type.label
      }
      types.push(type)
    }
    types._url = url
    return types
  }

}

SkosmosApiProvider.providerName = "SkosmosApi"

module.exports = SkosmosApiProvider
