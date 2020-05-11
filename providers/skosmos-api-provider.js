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
 * To use it in a registry, specify as "SkosmosApi":
 * ```json
 * {
 *  "provider": "SkosmosApi"
 *  "api": "http://base-url-of-skosmos-instance/rest/v1/"
 * }
 * ```
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
   * Returns all concept schemes.
   *
   * @param {Object} config
   * @returns {Object[]} array of JSKOS concept scheme objects
   */
  async getSchemes({ ...config }) {
    // TODO: Re-evaluate!
    if (!this._jskos.loadSchemeInfo) {
      const result = this.schemes
      return result
    }
    const schemes = []
    // TODO
    const language = this.languages[0] || "en"
    for (let scheme of this.schemes || []) {
      const url = `${this.api.api}${scheme.VOCID}/?lang=${language}`
      const data = await this.axios({
        ...config,
        method: "get",
        url,
      })
      const resultScheme = data.conceptschemes.find(s => jskos.compare(s, scheme))
      if (resultScheme && resultScheme.prefLabel) {
        _.set(scheme, `prefLabel.${language}`, resultScheme.prefLabel)
      }
      // TODO: If there is no label, redo the request with one of the available languages.
      schemes.push(scheme)
    }
    return schemes
  }

  /**
   * Method not yet implemented.
   */
  async getTop() {
    throw new errors.MethodNotImplementedError({ method: "getTop" })
  }

  /**
   * @private
   */
  _getDataUrl(concept, { addFormatParameter = true } = {}) {
    const scheme = _.get(concept, "inScheme[0]")
    if (!concept || !concept.uri || !scheme || !scheme.VOCID) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept", message: "Missing concept URI or missing VOCID on concept scheme" })
    }
    return `${this.api.api}${scheme.VOCID}/data${addFormatParameter ? "?format=application/json" : ""}`
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
        // Set prefLabel
        if (resultConcept.prefLabel && !_.isArray(resultConcept.prefLabel)) {
          resultConcept.prefLabel = [resultConcept.prefLabel]
        }
        for (let prefLabel of resultConcept.prefLabel || []) {
          _.set(concept, `prefLabel.${prefLabel.lang}`, prefLabel.value)
        }
        // Set altLabel
        if (resultConcept.altLabel && !_.isArray(resultConcept.altLabel)) {
          resultConcept.altLabel = [resultConcept.altLabel]
        }
        for (let altLabel of resultConcept.altLabel || []) {
          if (_.get(concept, `altLabel.${altLabel.lang}`)) {
            concept.altLabel[altLabel.lang].push(altLabel.value)
            concept.altLabel[altLabel.lang] = _.uniq(concept.altLabel[altLabel.lang])
          } else {
            _.set(concept, `altLabel.${altLabel.lang}`, [altLabel.value])
          }
        }
        // Set broader/narrower
        for (let type of ["broader", "narrower"]) {
          concept[type] = resultConcept[type] || concept[type]
          if (concept[type] && !_.isArray(concept[type])) {
            concept[type] = [concept[type]]
          }
          if (!concept[type]) {
            concept[type] = []
          }
          // Set prefLabel for broader/narrower
          for (let relative of concept[type]) {
            const resultRelative = result.graph.find(c => jskos.compare(c, relative))
            if (resultRelative) {
              if (resultRelative.prefLabel && !_.isArray(resultRelative.prefLabel)) {
                resultRelative.prefLabel = [resultRelative.prefLabel]
              }
              for (let prefLabel of resultRelative.prefLabel || []) {
                _.set(relative, `prefLabel.${prefLabel.lang}`, prefLabel.value)
              }
            }
            // Set ancestors to empty array
            relative.ancestors = []
          }
        }
        // ESLint exceptions see: https://github.com/eslint/eslint/issues/11899
        // Set ancestors to empty array
        // eslint-disable-next-line require-atomic-updates
        concept.ancestors = []
        // Set type
        if (resultConcept.type && !_.isArray(resultConcept.type)) {
          resultConcept.type = [resultConcept.type]
        }
        // eslint-disable-next-line require-atomic-updates
        concept.type = concept.type || []
        for (let type of resultConcept.type || []) {
          if (!jskos.isValidUri(type)) {
            continue
          }
          const uriScheme = type.slice(0, type.indexOf(":"))
          // Try to find uriScheme in @context
          if (result["@context"][uriScheme]) {
            type = type.replace(uriScheme + ":", result["@context"][uriScheme])
          }
          concept.type.push(type)
        }
        // eslint-disable-next-line require-atomic-updates
        concept.type = _.uniq(concept.type)
        newConcepts.push(concept)
      }
    }
    return newConcepts
  }

  /**
   * Method not yet implemented.
   */
  async getNarrower() {
    throw new errors.MethodNotImplementedError({ method: "getNarrower" })
  }

  /**
   * Method not yet implemented.
   */
  async getAncestors() {
    throw new errors.MethodNotImplementedError({ method: "getAncestors" })
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
    if (!scheme || !scheme.VOCID) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme or VOCID property on scheme" })
    }
    const url = `${this.api.api}${scheme.VOCID}/search`
    _.set(config, "params.query", `${search}*`)
    _.set(config, "params.unique", 1)
    _.set(config, "params.maxhits", limit || 100)
    _.set(config, "params.type", types.join(" "))
    const response = await this.axios({
      ...config,
      method: "get",
      url,
    })
    const concepts = []
    for (let concept of response.results || []) {
      const notation = jskos.notation({ uri: concept.uri, inScheme: [scheme] })
      const label = concept.matchedPrefLabel || concept.altLabel || concept.prefLabel
      const newConcept = {
        uri: concept.uri,
        prefLabel: {
          [concept.lang]: label,
        },
        inScheme: [scheme],
      }
      if (notation) {
        newConcept.notation = [notation]
      }
      concepts.push(newConcept)
    }
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
    if (!scheme || !scheme.VOCID) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme or VOCID property on scheme" })
    }
    const types = []
    const url = `${this.api.api}${scheme.VOCID}/types`
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
