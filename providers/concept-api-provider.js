const BaseProvider = require("./base-provider")
const _ = require("../utils/lodash")
const errors = require("../errors")
const utils = require("../utils")

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
class ConceptApiProvider extends BaseProvider {

  /**
   * @private
   */
  _prepare() {
    // Fill `this._api` if necessary
    if (this._api.api) {
      const endpoints = {
        status: "/status",
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
        if (!this._api[key]) {
          this._api[key] = utils.concatUrl(this._api.api, endpoints[key])
        }
      }
    }
  }

  /**
   * @private
   */
  _setup() {
    this.has.schemes = !!this._api.schemes
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
      properties: "uri,prefLabel,notation,inScheme",
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
      throw new errors.MissingApiUrlError()
    }
    if (Array.isArray(this._api.schemes)) {
      return this._api.schemes
    }
    return this.axios({
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
        uri: scheme.uri,
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
    if (!this.has.data) {
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
  async suggest({ search, scheme, limit, use = "notation,label", types = [], sort = "score", ...config }) {
    if (!this._api.suggest) {
      throw new errors.MissingApiUrlError()
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    limit = limit || this._jskos.suggestResultLimit || 100
    // Some registries use URL templates with {searchTerms}
    let url = this._api.suggest.replace("{searchTerms}", search)
    return this.axios({
      ...config,
      params: {
        ...this._defaultParams,
        voc: _.get(scheme, "uri", ""),
        limit: limit,
        count: limit, // Some endpoints use count instead of limit
        use,
        type: types.join("|"),
        sort,
        ...config.params,
        search,
      },
      method: "get",
      url,
    })
  }

  /**
   * Method not yet implemented.
   */
  async search() {
    throw new errors.MethodNotImplementedError({ method: "search" })
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
    if (scheme && scheme.uri) {
      _.set(config, "params.uri", scheme.uri)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this._api.types,
    })
  }

}

ConceptApiProvider.providerName = "ConceptApi"

module.exports = ConceptApiProvider
