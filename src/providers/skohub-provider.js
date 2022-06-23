import BaseProvider from "./base-provider.js"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import { listOfCapabilities } from "../utils/index.js"
import jskos from "jskos-tools"
import FlexSearch from "flexsearch"

// from https://stackoverflow.com/a/22021709
function decodeUnicode(text) {
  return text.replace(/\\u[\dA-F]{4}/gi,
    function (match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16))
    },
  )
}

/**
 * SkoHub Vocabs
 *
 * [SkoHub Vocabs](https://blog.lobid.org/2019/09/27/presenting-skohub-vocabs.html) is a static site generator that provides HTML/JSON versions of vocabularies as static files.
 *
 * Example vocabulary (configured below): https://w3id.org/class/esc/scheme
 *
 * It is important that a dereferenceable scheme URI is used. When configured via [BARTOC](https://bartoc.org/) in the `API` field, "http://bartoc.org/api-type/skohub" needs to be given as the type and the aforementioned dereferenceable scheme URI needs to be given as the URL.
 *
 * See also: https://github.com/gbv/cocoda-sdk/issues/29
 *
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/skohub.io",
 *  "provider": "Skohub",
 *  "schemes": [
 *    {
 *      "uri": "https://w3id.org/class/esc/scheme",
 *    }
 *  ]
 * }
 */
export default class SkohubProvider extends BaseProvider {

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
    this._index = {}
    this._conceptCache = {}
    this._schemeCache = {}
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
    // Save scheme with "url" as main URI, add other identifier
    const newScheme = { uri: url, identifier: jskos.getAllUris(scheme).filter(uri => uri !== url) }
    return { schemes: [newScheme] }
  }

  async _loadScheme({ scheme, ...config }) {
    let uris = jskos.getAllUris(scheme)
    for (let uri of uris) {
      if (this._schemeCache[uri]) {
        return this._schemeCache[uri]
      }
    }
    // Find main URI from this.schemes
    const schemeFromList = this.schemes.find(s => jskos.compare(s, scheme))

    if (!schemeFromList || !schemeFromList.uri) {
      throw new errors.InvalidRequestError({ message: `Tried to load unsupported scheme (${scheme && scheme.uri})` })
    }
    const uri = schemeFromList.uri
    uris = _.uniq(uris.concat(jskos.getAllUris(schemeFromList)))

    let postfix = ".json"
    if (uri.endsWith("/")) {
      postfix = "index.json"
    }
    // Errors for this request will trickle upwards of the call chain
    const data = await this.axios({ ...config, url: `${uri}${postfix}`, _skipAdditionalParameters: true })

    if (data.id !== uri) {
      throw new errors.InvalidRequestError({ message: "Skohub URL did not return expected concept scheme" })
    }

    const { title, preferredNamespaceUri, hasTopConcept, description } = data

    scheme = { uri, identifier: uris.filter(u => u !== uri) }
    scheme.prefLabel = title
    Object.keys(scheme.prefLabel || {}).forEach(key => {
      scheme.prefLabel[key] = decodeUnicode(scheme.prefLabel[key])
    })
    scheme.namespace = preferredNamespaceUri
    scheme.topConcepts = (hasTopConcept || []).map(c => this._toJskosConcept(c))
    scheme.concepts = [null]
    if (description) {
      scheme.definition = description
      // scopeNote values in JSKOS are arrays
      Object.keys(scheme.definition).forEach(key => {
        scheme.definition[key] = [decodeUnicode(scheme.definition[key])]
      })
    }
    // Remove fields without value
    for (let key of Object.keys(scheme).filter(key => !scheme[key])) {
      delete scheme[key]
    }

    // Add to cache
    for (let uri of uris) {
      this._schemeCache[uri] = scheme
    }

    return scheme
  }

  async _loadConcept({ uri, ...config }) {
    // Use cache first
    if (this._conceptCache[uri]) {
      return this._conceptCache[uri]
    }

    try {
      const data = await this.axios({ ...config, url: `${uri}.json`, _skipAdditionalParameters: true })
      if (data.id !== uri) {
        throw new errors.InvalidRequestError({ message: "Skohub URL did not return expected concept URI" })
      }
      const concept = this._toJskosConcept(data)
      this._conceptCache[uri] = concept
      return concept
    } catch (error) {
      // Return null on error
      return null
    }
  }

  _toJskosConcept(data) {
    const concept = { uri: data.id }

    concept.prefLabel = data.prefLabel
    Object.keys(concept.prefLabel || {}).forEach(key => {
      concept.prefLabel[key] = decodeUnicode(concept.prefLabel[key])
    })
    concept.narrower = (data.narrower || []).map(c => this._toJskosConcept(c))
    concept.notation = data.notation || []
    if (data.broader && data.broader.id) {
      concept.broader = [{ uri: data.broader.id }]
    }
    if (data.inScheme && data.inScheme.id) {
      concept.inScheme = [{ uri: data.inScheme.id }]
    }
    if (data.scopeNote) {
      concept.scopeNote = data.scopeNote
      // scopeNote values in JSKOS are arrays
      Object.keys(concept.scopeNote).forEach(key => {
        concept.scopeNote[key] = [decodeUnicode(concept.scopeNote[key])]
      })
    }

    return concept
  }

  async getSchemes({ ...config }) {
    return Promise.all(this.schemes.map(scheme => this._loadScheme({ ...config, scheme })))
  }

  async getTop({ scheme, ...config }) {
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme URI" })
    }

    scheme = await this._loadScheme({ scheme, ...config })
    return scheme.topConcepts || []
  }

  async getConcepts({ concepts, ...config }) {
    if (!_.isArray(concepts)) {
      concepts = [concepts]
    }
    // Concepts have to be loaded separately, so we parallelize it with Promise.all
    return (await Promise.all(concepts.map(({ uri }) => this._loadConcept({ ...config, uri })))).filter(Boolean)
  }

  async getAncestors({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.ancestors && concept.ancestors[0] !== null) {
      return concept.ancestors
    }
    concept = await this._loadConcept({ ...config, uri: concept.uri })
    if (!concept || !concept.broader || !concept.broader.length) {
      return []
    }
    const broader = concept.broader[0]
    return [broader].concat(await this.getAncestors({ concept: broader, ...config })).map(c => ({ uri: c.uri }))
  }

  async getNarrower({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.narrower && concept.narrower[0] !== null) {
      return concept.narrower
    }
    concept = await this._loadConcept({ ...config, uri: concept.uri })
    return concept.narrower
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
    scheme = await this._loadScheme({ scheme })
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    // 1. Load index file if necessary
    let index
    if (!this._index[scheme.uri]) {
      this._index[scheme.uri] = {}
    }
    // Iterate over languages and use the first one that has an index
    for (const lang of [""].concat(this.languages)) {
      if (this._index[scheme.uri][lang]) {
        index = this._index[scheme.uri][lang]
        break
      }
      // `null` means the request failed before, so we won't try again
      if (this._index[scheme.uri][lang] === null) {
        continue
      }
      try {
        let postfix = lang ? `.${lang}.index` : ".index"
        if (scheme.uri.endsWith("/")) {
          postfix = `index${postfix}`
        }
        const data = await this.axios({ url: `${scheme.uri}${postfix}`, _skipAdditionalParameters: true })
        if (data.length < 100) {
          // Assume the index is empty and skip it
          this._index[scheme.uri][lang] = null
          continue
        }
        index = FlexSearch.create()
        index.import(data)
        this._index[scheme.uri][lang] = index
        break
      } catch (error) {
        // ? Can we differentiate between errors? error.response is undefined for some reason.
        this._index[scheme.uri][lang] = null
      }
    }
    if (!index) {
      throw new errors.InvalidRequestError({ message: "Could not find search index for any of the available languages " + this.languages.join(",") })
    }
    // 2. Use Flexsearch to get result URIs from index
    const result = index.search(search)
    // 3. Load concept data for results
    const concepts = await this.getConcepts({ concepts: result.map(uri => ({ uri })) })
    return concepts.slice(0, limit)
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

SkohubProvider.providerName = "Skohub"
SkohubProvider.providerType = "http://bartoc.org/api-type/skohub"
