import BaseProvider from "./base-provider.js"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import * as utils from "../utils/index.js"
import jskos from "jskos-tools"

/**
 * JSKOS Concept API.
 *
 * This class provides access to concept schemes and their concepts via JSKOS API in [JSKOS format](https://gbv.github.io/jskos/).
 * See [jskos-server](https://github.com/gbv/jskos-server) for a JSKOS API reference implementation and [DANTE](https://api.dante.gbv.de/) for another API endpoint.
 *
 * To use it in a registry, specify `provider` as "ConceptApi" and provide the API base URL as `api`:
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/coli-conc-concepts",
 *  "provider": "ConceptApi",
 *  "api": "https://coli-conc.gbv.de/api/"
 * }
 * ```
 *
 * If the `/status` endpoint can be queried, the remaining API methods will be taken from that. As a fallback, the default endpoints will be appended to `api`.
 *
 * Alternatively, you can provide the endpoints separately: `status`, `schemes`, `top`, `concepts`, `data`, `narrower`, `ancestors`, `types`, `suggest`, `search`
 * Note that `schemes`, `top`, and `types` can also be provided as arrays.
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ConceptApiProvider extends BaseProvider {

  /**
   * @private
   */
  _prepare() {
    // Set status endpoint only
    if (this._api.api && this._api.status === undefined) {
      this._api.status = utils.concatUrl(this._api.api, "/status")
    }
    // Set capabilities to true for now; will be overridden by _setup() later
    this.has.schemes = true
    this.has.top = true
    this.has.data = true
    this.has.concepts = true
    this.has.narrower = true
    this.has.ancestors = true
    this.has.types = true
    this.has.suggest = true
    this.has.search = true
    this.has.auth = true
    // Explicitly set other capabilities to false
    utils.listOfCapabilities.filter(c => !this.has[c]).forEach(c => {
      this.has[c] = false
    })
  }

  /**
   * @private
   */
  _setup() {
    // Implicitly fill `this._api` if necessary
    if (this._api.api) {
      const endpoints = {
        schemes: "/voc",
        top: "/voc/top",
        concepts: "/voc/concepts",
        data: "/data",
        narrower: "/narrower",
        ancestors: "/ancestors",
        types: "/types",
        suggest: "/suggest",
        search: "/search",
      }
      for (let key of Object.keys(endpoints)) {
        // Only override if undefined
        if (this._api[key] === undefined) {
          this._api[key] = utils.concatUrl(this._api.api, endpoints[key])
        }
      }
    }
    this.has.schemes = !!this._api.schemes
    // If there is no scheme API endpoint, but a list of schemes is given, use that for schemes.
    if (!this.has.schemes && Array.isArray(this.schemes)) {
      this.has.schemes = true
    }
    this.has.top = !!this._api.top
    this.has.data = !!this._api.data
    this.has.concepts = !!this._api.concepts || this.has.data
    this.has.narrower = !!this._api.narrower
    this.has.ancestors = !!this._api.ancestors
    this.has.types = !!this._api.types
    this.has.suggest = !!this._api.suggest
    this.has.search = !!this._api.search
    this.has.auth = _.get(this._config, "auth.key") != null
    this._defaultParams = {
      // Default parameters mostly for DANTE
      properties: "+created,issued,modified,editorialNote,scopeNote",
    }
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept schceme.
   *
   * @param {Object} options
   * @param {Object} options.url API URL for server
   * @returns {Object} provider configuration
   */
  static _registryConfigForBartocApiConfig({ url, scheme } = {}) {
    if (!url || !scheme) {
      return null
    }
    return {
      api: url,
      schemes: [scheme],
    }
  }

  /**
   * Returns the main vocabulary URI by requesting the scheme info and saving it in a cache.
   *
   * @private
   */
  async _getSchemeUri(scheme) {
    this._approvedSchemes = this._approvedSchemes || []
    this._rejectedSchemes = this._rejectedSchemes || []
    let _scheme = this._approvedSchemes.find(s => jskos.compare(scheme, s))
    if (_scheme) {
      return _scheme.uri
    }
    // Return null if it was already rejected
    if (this._rejectedSchemes.find(s => jskos.compare(scheme, s))) {
      return null
    }
    // Otherwise load scheme data and save in approved/rejected schemes
    const schemes = await this.getSchemes({ params: {
      uri: jskos.getAllUris(scheme).join("|"),
    } })
    const resultScheme = schemes.find(s => jskos.compare(s, scheme))
    if (resultScheme) {
      this._approvedSchemes.push({
        uri: resultScheme.uri,
        identifier: jskos.getAllUris(scheme),
      })
      return resultScheme.uri
    } else {
      this._rejectedSchemes.push({
        uri: scheme.uri,
        identifier: scheme.identifier,
      })
      return null
    }
  }

  /**
   * Returns all concept schemes.
   *
   * @param {Object} config
   * @returns {Object[]} array of JSKOS concept scheme objects
   */
  async getSchemes(config) {
    if (!this._api.schemes) {
      // If an array of schemes is given, return that here
      if (Array.isArray(this.schemes)) {
        return this.schemes
      }
      throw new errors.MissingApiUrlError()
    }
    const schemes = await this.axios({
      ...config,
      method: "get",
      url: this._api.schemes,
      params: {
        ...this._defaultParams,
        // ? What should the default limit be?
        limit: 500,
        ...(config.params || {}),
      },
    })
    // If schemes were given in registry object, only request those schemes from API
    if (Array.isArray(this.schemes)) {
      return utils.withCustomProps(schemes.filter(s => jskos.isContainedIn(s, this.schemes)), schemes)
    } else {
      return schemes
    }
  }

  /**
   * Returns top concepts for a concept scheme.
   *
   * @param {Object} config
   * @param {Object} config.scheme concept scheme object
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getTop({ scheme, ...config }) {
    if (!this._api.top) {
      throw new errors.MissingApiUrlError()
    }
    if (!scheme) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    const schemeUri = await this._getSchemeUri(scheme)
    if (!schemeUri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Requested vocabulary seems to be unsupported by this API." })
    }
    if (Array.isArray(this._api.top)) {
      return this._api.top
    }
    return this.axios({
      ...config,
      method: "get",
      url: this._api.top,
      params: {
        ...this._defaultParams,
        // ? What should the default limit be?
        limit: 10000,
        ...(config.params || {}),
        uri: schemeUri,
      },
    })
  }

  /**
   * Returns details for a list of concepts.
   *
   * @param {Object} config
   * @param {Object[]} config.concepts list of concept objects to load
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getConcepts({ concepts, ...config }) {
    if (this.has.data === false) {
      throw new errors.MissingApiUrlError()
    }
    if (!concepts) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concepts" })
    }
    if (!Array.isArray(concepts)) {
      concepts = [concepts]
    }
    let uris = concepts.map(concept => concept.uri).filter(uri => uri != null)
    return this.axios({
      ...config,
      method: "get",
      url: this._api.data,
      params: {
        ...this._defaultParams,
        // ? What should the default limit be?
        limit: 500,
        ...(config.params || {}),
        uri: uris.join("|"),
      },
    })
  }

  /**
   * Returns narrower concepts for a concept.
   *
   * @param {Object} config
   * @param {Object} config.concept concept object
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getNarrower({ concept, ...config }) {
    if (!this._api.narrower) {
      throw new errors.MissingApiUrlError()
    }
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    return this.axios({
      ...config,
      method: "get",
      url: this._api.narrower,
      params: {
        ...this._defaultParams,
        // ? What should the default limit be?
        limit: 10000,
        ...(config.params || {}),
        uri: concept.uri,
      },
    })
  }

  /**
   * Returns ancestor concepts for a concept.
   *
   * @param {Object} config
   * @param {Object} config.concept concept object
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getAncestors({ concept, ...config }) {
    if (!this._api.ancestors) {
      throw new errors.MissingApiUrlError()
    }
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    return this.axios({
      ...config,
      method: "get",
      url: this._api.ancestors,
      params: {
        ...this._defaultParams,
        // ? What should the default limit be?
        limit: 10000,
        ...(config.params || {}),
        uri: concept.uri,
      },
    })
  }

  /**
   * Returns suggestion result in OpenSearch Suggest Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} [config.scheme] concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {string} [config.use=notation,label] which fields to search ("notation", "label" or "notation,label")
   * @param {string[]} [config.types=[]] list of type URIs
   * @param {string} [config.sort=score] sorting parameter
   * @returns {Array} result in OpenSearch Suggest Format
   */
  async suggest({ use = "notation,label", types = [], sort = "score", params = {}, ...config }) {
    return this._search({
      ...config,
      endpoint: "suggest",
      params: {
        ...params,
        type: types.join("|"),
        use,
        sort,
      },
    })
  }

  /**
   * Returns search results in JSKOS Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} [config.scheme] concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {number} [config.offset=0] offset
   * @param {string[]} [config.types=[]] list of type URIs
   * @returns {Array} result in JSKOS Format
   */
  async search({ types = [], params = {}, ...config }) {
    return this._search({
      ...config,
      endpoint: "search",
      params: {
        ...params,
        type: types.join("|"),
      },
    })
  }

  /**
   * Returns concept scheme suggestion result in OpenSearch Suggest Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {string} [config.use=notation,label] which fields to search ("notation", "label" or "notation,label")
   * @param {string} [config.sort=score] sorting parameter
   * @returns {Array} result in OpenSearch Suggest Format
   */
  async vocSuggest({ use = "notation,label", sort = "score", params = {}, ...config }) {
    return this._search({
      ...config,
      endpoint: "voc-suggest",
      params: {
        ...params,
        use,
        sort,
      },
    })
  }

  /**
   * Returns concept scheme search results in JSKOS Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {number} [config.offset=0] offset
   * @returns {Array} result in JSKOS Format
   */
  async vocSearch(config) {
    return this._search({
      ...config,
      endpoint: "voc-search",
    })
  }

  async _search({ endpoint, scheme, search, limit, offset, params, url, ...config }) {
    // Allows API URL override via parameter
    url = url ?? this._api[endpoint]
    if (!url) {
      throw new errors.MissingApiUrlError()
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    limit = limit || this._jskos.suggestResultLimit || 100
    offset = offset || 0
    // Scheme to search in
    const voc = scheme && await this._getSchemeUri(scheme)
    // Some registries use URL templates with {searchTerms}
    url = url.replace("{searchTerms}", search)
    return this.axios({
      ...config,
      params: {
        ...this._defaultParams,
        ...params,
        limit: limit,
        count: limit, // Some endpoints use count instead of limit
        offset,
        search,
        query: search,
        voc,
      },
      method: "get",
      url,
    })
  }

  /**
   * Returns a list of types.
   *
   * @param {Object} config
   * @param {Object} [config.scheme] concept scheme to load types for
   * @returns {Object[]} array of JSKOS type objects
   */
  async getTypes({ scheme, ...config }) {
    if (!this._api.types) {
      throw new errors.MissingApiUrlError()
    }
    if (Array.isArray(this._api.types)) {
      return this._api.types
    }
    const schemeUri = scheme && await this._getSchemeUri(scheme)
    if (schemeUri) {
      _.set(config, "params.uri", schemeUri)
    }
    let types = await this.axios({
      ...config,
      method: "get",
      url: this._api.types,
    })
    // It might be necessary to filter the result by its `inScheme` property (only if it exists, otherwise assume it belongs to the requested scheme URI).
    if (schemeUri) {
      types = types.filter(type => !type.inScheme || jskos.isContainedIn(scheme, type.inScheme))
    }
    return types
  }

}

ConceptApiProvider.providerName = "ConceptApi"
ConceptApiProvider.providerType = "http://bartoc.org/api-type/jskos"
