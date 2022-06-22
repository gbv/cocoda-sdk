import BaseProvider from "./base-provider.js"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import { listOfCapabilities } from "../utils/index.js"
import jskos from "jskos-tools"
import FlexSearch from "flexsearch"

// from https://stackoverflow.com/a/22021709
function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi,
    function (match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16))
    },
  )
}

/**
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
    this._jskos.schemes = this.schemes || []
    this._index = {}
    this._cache = {}
  }

  async getSchemes({ ...config }) {
    const { schemes } = this._jskos

    for (let i=0; i<schemes.length; i++) {
      schemes[i] = await this._loadScheme(schemes[i], config)
    }

    return schemes
  }

  async _loadScheme(scheme, config) {
    const { uri, topConcepts } = scheme

    if (!uri || topConcepts) {
      return scheme
    }

    let postfix = ".json"
    if (uri.endsWith("/")) {
      postfix = "index.json"
    }
    const data = await this.axios({ ...config, url: `${uri}${postfix}`, _skipAdditionalParameters: true })

    // TODO: if not found

    if (data.id !== uri) {
      throw new errors.InvalidRequestError({ message: "Skohub URL did not return expected concept scheme" })
    }

    const { title, preferredNamespaceUri, hasTopConcept, description } = data //, issued, created, modified, creator, publisher } = data

    scheme.prefLabel = title
    scheme.namespace = preferredNamespaceUri
    scheme.topConcepts = (hasTopConcept || []).map(c => this._mapConcept(c))

    // const hasNarrower = scheme.topConcepts.find(c => c.narrower && c.narrower.length)

    scheme.concepts = [null]
    // scheme.concepts = [...scheme.topConcepts]
    // if (hasNarrower) {
    //   scheme.concepts.push(null)
    // }

    // TODO: map remaining fields

    if (description) {
      scheme.definition = description
      // scopeNote values in JSKOS are arrays
      Object.keys(scheme.definition).forEach(key => {
        scheme.definition[key] = [scheme.definition[key]]
      })
    }

    // remove fields without value
    for (let key of Object.keys(scheme).filter(key => !scheme[key])) {
      delete scheme[key]
    }

    return scheme
  }

  async getTop({ scheme, ...config }) {
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme URI" })
    }

    scheme = this._jskos.schemes.find(s => s.uri === scheme.uri)
    if (scheme) {
      scheme = await this._loadScheme(scheme, config)
      return scheme.topConcepts
    } else {
      return []
    }
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


  async _loadConcept({ uri, ...config }) {
    // Use cache first
    if (this._cache[uri]) {
      return this._cache[uri]
    }

    try {
      const data = await this.axios({ ...config, url: `${uri}.json`, _skipAdditionalParameters: true })
      if (data.id !== uri) {
        throw new errors.InvalidRequestError({ message: "Skohub URL did not return expected concept URI" })
      }
      const concept = this._mapConcept(data)
      this._cache[uri] = concept
      return concept
    } catch (error) {
      // Return null on error
      return null
    }
  }

  _mapConcept(data) {
    const concept = { uri: data.id }

    concept.prefLabel = data.prefLabel
    Object.keys(concept.prefLabel || {}).forEach(key => {
      concept.prefLabel[key] = unicodeToChar(concept.prefLabel[key])
    })
    concept.narrower = (data.narrower || []).map(c => this._mapConcept(c))
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
        concept.scopeNote[key] = [unicodeToChar(concept.scopeNote[key])]
      })
    }

    return concept
  }
}

SkohubProvider.providerName = "Skohub"
SkohubProvider.providerType = "http://bartoc.org/api-type/skohub"
