import BaseProvider from "./base-provider.js"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import jskos from "jskos-tools"
import FlexSearch from "flexsearch"

// Holds all scheme data (filed by scheme URI as key)
const data = {}

/**
 * MyCoRe Classification API
 *
 * See also: https://github.com/gbv/cocoda-sdk/issues/50
 *
 * To use it in a registry, specify `provider` as "MyCoRe" and provide the API URL as `api`:
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/mycore-shbsg",
 *  "provider": "MyCoRe",
 *  "api": "https://bibliographie.schleswig-holstein.de/api/v2/classifications/shbib_sachgruppen.json"
 * }
 * ```
 *
 * Specifying `schemes` is currently not required and it will not be used. Currently supports only one vocabulary per registry.
 *
 */
export default class MyCoReProvider extends BaseProvider {
  static supports = {
    schemes: true,
    top: true,
    data: true,
    concepts: true,
    narrower: true,
    ancestors: true,
    suggest: true,
    search: true,
  }

  _setup() {
    this._scheme = null
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept schceme.
   *
   * @param {Object} options
   * @param {Object} options.url API URL for BARTOC instance
   * @param {Object} options.scheme scheme for which the config is requested
   * @returns {Object} provider configuration
   */
  static _registryConfigForBartocApiConfig({ url, scheme } = {}) {
    if (!url || !scheme) {
      return null
    }
    return {
      api: url,
    }
  }

  /**
   * Converts scheme info (full scheme data that comes from the API) to a JSKOS scheme
   */
  _schemeInfoToJSKOS(schemeInfo) {
    const uri = schemeInfo.labels.find(l => l.lang === "x-uri").text
    const prefLabel = {}
    schemeInfo.labels.filter(l => !l.lang.startsWith("x-")).forEach(l => {
      prefLabel[l.lang] = l.text
    })
    const scheme = {
      uri,
      prefLabel,
    }
    if (schemeInfo.categories && schemeInfo.categories.length) {
      scheme.topConcepts = [null]
    }
    // ? Is this accurate?
    if (schemeInfo.category && schemeInfo.category.length) {
      scheme.concepts = [null]
    }
    return scheme
  }

  /**
   * Converts a category to a JSKOS concept.
   * - Also saves that concept in data
   * - Also adds the concept's prefLabels to the search index
   *
   * ? Question: Should scopeNotes be part of the search index?
   */
  _categoryToJSKOS(category, { scheme, broader = [] }) {
    if (!category || !scheme) {
      return null
    }
    const id = category.ID
    const uri = `${scheme.uri}/${id}`
    if (data[scheme.uri].concepts[uri]) {
      return data[scheme.uri].concepts[uri]
    }
    const prefLabel = {}
    category.labels.filter(l => !l.lang.startsWith("x-") && l.text).forEach(l => {
      // Remove ID from label
      prefLabel[l.lang] = l.text.replace(`${id} `, "")
      // Add prefLabel to search index
      data[scheme.uri].searchIndex.add(uri, prefLabel[l.lang])
    })
    const scopeNote = {}
    category.labels.filter(l => !l.lang.startsWith("x-") && l.description).forEach(l => {
      if (!scopeNote[l.lang]) {
        scopeNote[l.lang] = []
      }
      scopeNote[l.lang].push(l.description)
    })
    data[scheme.uri].concepts[uri] = {
      uri,
      notation: [id],
      prefLabel,
      scopeNote,
      inScheme: [{ uri: scheme.uri }],
      narrower: (category.categories || []).map(c => ({ uri: `${scheme.uri}/${c.ID}`})),
      broader,
    }
    return data[scheme.uri].concepts[uri]
  }

  /**
   * Helper function that replaces `narrower` key with [null] if it has values. Use this before returning concepts.
   */
  _removeNarrower(concept) {
    if (!concept) {
      return concept
    }
    return Object.assign({}, concept, { narrower: (concept.narrower && concept.narrower.length) ? [null] : []})
  }

  /**
   * Loads the data from the API. Only called from getSchemes and only called once.
   */
  async _loadSchemeData(config) {
    const schemeInfo = await this.axios({
      ...config,
      method: "get",
      url: this._api.api,
      _skipAdditionalParameters: true,
    })
    this._scheme = this._schemeInfoToJSKOS(schemeInfo)
    const uri = this._scheme.uri
    data[uri] = {
      schemeInfo,
      searchIndex: FlexSearch.create({
        tokenize: "full",
      }),
      concepts: {},
    }
    // Recursively go through all concepts and convert them to JSKOS
    const dealWithCategory = (category, { broader = [] } = {}) => {
      const concept = this._categoryToJSKOS(category, { scheme: this._scheme, broader })
      ;(category.categories || []).forEach(c => dealWithCategory(c, { broader: [{ uri: concept.uri }] }))
    }
    schemeInfo.categories.forEach(category => dealWithCategory(category))
    data[uri].topConcepts = schemeInfo.categories.map(category => this._categoryToJSKOS(category, { scheme: this._scheme }))
  }

  async getSchemes(config = {}) {
    if (!this._api.api) {
      throw new errors.MissingApiUrlError()
    }
    if (!this._scheme) {
      // Make sure data is only loaded once
      if (!this._loadSchemeDataPromise) {
        this._loadSchemeDataPromise = this._loadSchemeData(config)
      }
      await this._loadSchemeDataPromise
    }

    return [this._scheme]
  }

  async getTop({ scheme, ...config }) {
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme URI" })
    }
    if (!this._scheme) {
      await this.getSchemes(config)
    }
    if (!jskos.compare(scheme, this._scheme)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Requested vocabulary seems to be unsupported by this API." })
    }
    return data[this._scheme.uri].topConcepts.map(this._removeNarrower)
  }

  async getConcepts({ concepts, ...config }) {
    if (!_.isArray(concepts)) {
      concepts = [concepts]
    }
    if (!this._scheme) {
      await this.getSchemes(config)
    }
    return concepts.map(c => data[this._scheme.uri].concepts[c.uri]).map(this._removeNarrower)
  }

  async getAncestors({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.ancestors && concept.ancestors[0] !== null) {
      return concept.ancestors
    }
    if (!this._scheme) {
      await this.getSchemes(config)
    }
    concept = data[this._scheme.uri].concepts[concept.uri]
    const broader = concept && concept.broader && concept.broader[0]
    if (!broader) {
      return []
    }
    return [broader].concat(await this.getAncestors({ concept: broader, ...config }))
  }

  async getNarrower({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.narrower && concept.narrower[0] !== null) {
      return concept.narrower
    }
    if (!this._scheme) {
      await this.getSchemes(config)
    }
    concept = data[this._scheme.uri].concepts[concept.uri]
    return (concept && concept.narrower || []).map(c => data[this._scheme.uri].concepts[c.uri]).map(this._removeNarrower)
  }

  /**
   * Returns concept search results.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} [config.scheme] concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results
   * @returns {Array} array of JSKOS concept objects
   */
  async search({ search, scheme, limit = 100 }) {
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme URI" })
    }
    if (!this._scheme) {
      await this.getSchemes()
    }
    if (!jskos.compare(scheme, this._scheme)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Requested vocabulary seems to be unsupported by this API." })
    }
    // Use Flexsearch to get result URIs from index
    const result = await data[this._scheme.uri].searchIndex.search(search)

    return result.map(uri => data[this._scheme.uri].concepts[uri]).map(this._removeNarrower).slice(0, limit)
  }

  /**
   * Returns suggestion result in OpenSearch Suggest Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} [config.scheme] concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results
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
}

MyCoReProvider.providerName = "MyCoRe"
MyCoReProvider.providerType = "http://bartoc.org/api-type/mycore"
