import BaseProvider from "./base-provider.js"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import { listOfCapabilities } from "../utils/index.js"
import jskos from "jskos-tools"
import FlexSearch from "flexsearch"

/**
 * MyCoRE Classification API
 *
 * See also: https://github.com/gbv/cocoda-sdk/issues/50
 */
export default class MyCoReProvider extends BaseProvider {

  _prepare() {
    this.has.schemes = true
    this.has.top = true
    this.has.data = true
    this.has.concepts = true
    this.has.narrower = true
    this.has.ancestors = true
    this.has.suggest = true
    this.has.search = true
    // Explicitly set other capabilities to false
    listOfCapabilities.filter(c => !this.has[c]).forEach(c => {
      this.has[c] = false
    })
  }

  _setup() {
    this._schemeInfo = null
    this._scheme = null
    this._topConcepts = null
    this._searchIndex = null
    this._concepts = {}
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
   * - Also saves that concept in this._concepts
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
    if (this._concepts[uri]) {
      return this._concepts[uri]
    }
    const prefLabel = {}
    category.labels.filter(l => !l.lang.startsWith("x-") && l.text).forEach(l => {
      // Remove ID from label
      prefLabel[l.lang] = l.text.replace(`${id} `, "")
      // Add prefLabel to search index
      this._searchIndex.add(uri, prefLabel[l.lang])
    })
    const scopeNote = {}
    category.labels.filter(l => !l.lang.startsWith("x-") && l.description).forEach(l => {
      if (!scopeNote[l.lang]) {
        scopeNote[l.lang] = []
      }
      scopeNote[l.lang].push(l.description)
    })
    this._concepts[uri] = {
      uri,
      notation: [id],
      prefLabel,
      scopeNote,
      inScheme: [{ uri: scheme.uri }],
      narrower: (category.categories || []).map(c => ({ uri: `${scheme.uri}/${c.ID}`})),
      broader,
    }
    return this._concepts[uri]
  }

  /**
   * Helper function that replaces `narrower` key with [null] if it has values. Use this before returning concepts.
   */
  _removeNarrower(concept) {
    if (!concept) return concept
    return Object.assign({}, concept, { narrower: (concept.narrower && concept.narrower.length) ? [null] : []})
  }

  /**
   * Loads the data from the API. Only called from getSchemes and only called once.
   */
  async _loadSchemeData(config) {
    this._schemeInfo = await this.axios({
      ...config,
      method: "get",
      url: this._api.api,
      _skipAdditionalParameters: true,
    })
    this._scheme = this._schemeInfoToJSKOS(this._schemeInfo)
    this._searchIndex = FlexSearch.create({
      tokenize: "full",
    })
    // Recursively go through all concepts and convert them to JSKOS
    const dealWithCategory = (category, { broader = [] } = {}) => {
      const concept = this._categoryToJSKOS(category, { scheme: this._scheme, broader })
      ;(category.categories || []).forEach(c => dealWithCategory(c, { broader: [{ uri: concept.uri }] }))
    }
    this._schemeInfo.categories.forEach(category => dealWithCategory(category))
    this._topConcepts = this._schemeInfo.categories.map(category => this._categoryToJSKOS(category, { scheme: this._scheme }))
  }

  async getSchemes(config = {}) {
    if (!this._api.api) {
      throw new errors.MissingApiUrlError()
    }
    if (!this._schemeInfo || !this._scheme) {
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
    if (!this._schemeInfo || !this._scheme) {
      await this.getSchemes(config)
    }
    if (!jskos.compare(scheme, this._scheme)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Requested vocabulary seems to be unsupported by this API." })
    }
    return this._topConcepts.map(this._removeNarrower)
  }

  async getConcepts({ concepts, ...config }) {
    if (!_.isArray(concepts)) {
      concepts = [concepts]
    }
    if (!this._schemeInfo || !this._scheme) {
      await this.getSchemes(config)
    }
    return concepts.map(c => this._concepts[c.uri]).map(this._removeNarrower)
  }

  async getAncestors({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.ancestors && concept.ancestors[0] !== null) {
      return concept.ancestors
    }
    if (!this._schemeInfo || !this._scheme) {
      await this.getSchemes(config)
    }
    concept = this._concepts[concept.uri]
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
    if (!this._schemeInfo || !this._scheme) {
      await this.getSchemes(config)
    }
    concept = this._concepts[concept.uri]
    return (concept && concept.narrower || []).map(c => this._concepts[c.uri]).map(this._removeNarrower)
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
    if (!this._schemeInfo || !this._scheme) {
      await this.getSchemes()
    }
    if (!jskos.compare(scheme, this._scheme)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Requested vocabulary seems to be unsupported by this API." })
    }
    // Use Flexsearch to get result URIs from index
    const result = await this._searchIndex.search(search)

    return result.map(uri => this._concepts[uri]).map(this._removeNarrower).slice(0, limit)
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
