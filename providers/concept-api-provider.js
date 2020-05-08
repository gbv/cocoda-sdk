const BaseProvider = require("./base-provider")
const _ = require("../utils/lodash")
const errors = require("../errors")

/**
 * For APIs that provide concept schemes and concepts in JSKOS format
 * like [DANTE](https://api.dante.gbv.de/) and jskos-server
 * [jskos-server](https://github.com/gbv/jskos-server).
 *
 * To use this in a registry, specific it as "ConceptApi":
 * ```json
 * {
 *  "provider": "ConceptApi"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
class ConceptApiProvider extends BaseProvider {

  /**
   * @private
   */
  _setup() {
    this.has.schemes = !!this.api.schemes
    this.has.top = !!this.api.top
    this.has.data = !!this.api.data
    this.has.concepts = !!this.api.concepts || this.has.data
    this.has.narrower = !!this.api.narrower
    this.has.ancestors = !!this.api.ancestors
    this.has.types = !!this.api.types
    this.has.suggest = !!this.api.suggest
    this.has.search = !!this.api.search
  }

  /**
   * Returns all concept schemes.
   *
   * @param {Object} config
   * @returns {Object[]} array of JSKOS concept scheme objects
   */
  async getSchemes(config) {
    if (!this.api.schemes) {
      throw new errors.MissingApiUrlError()
    }
    if (Array.isArray(this.api.schemes)) {
      return this.api.schemes
    }
    // ? Should we really do it this way?
    if (!_.get(config, "params.limit")) {
      _.set(config, "params.limit", 500)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.api.schemes,
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
    if (!this.api.top) {
      throw new errors.MissingApiUrlError()
    }
    if (!scheme) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    if (Array.isArray(this.api.top)) {
      return this.api.top
    }
    _.set(config, "params.uri", scheme.uri)
    // ? Should we really do it this way?
    if (!_.get(config, "params.limit")) {
      _.set(config, "params.limit", 10000)
    }
    // ? Properties
    return this.axios({
      ...config,
      method: "get",
      url: this.api.top,
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
    _.set(config, "params.uri", uris.join("|"))
    // ? Properties
    return this.axios({
      ...config,
      method: "get",
      url: this.api.data,
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
    if (!this.api.narrower) {
      throw new errors.MissingApiUrlError()
    }
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    _.set(config, "params.uri", concept.uri)
    // ? Properties
    // ? Should we really do it this way?
    if (!_.get(config, "params.limit")) {
      _.set(config, "params.limit", 10000)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.api.narrower,
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
    if (!this.api.ancestors) {
      throw new errors.MissingApiUrlError()
    }
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    _.set(config, "params.uri", concept.uri)
    // ? Properties
    // ? Should we really do it this way?
    if (!_.get(config, "params.limit")) {
      _.set(config, "params.limit", 10000)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.api.ancestors,
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
    if (!this.api.suggest) {
      throw new errors.MissingApiUrlError()
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    limit = limit || this._jskos.suggestResultLimit || 100
    // Some registries use URL templates with {searchTerms}
    let url = this.api.suggest.replace("{searchTerms}", search)
    return this.axios({
      ...config,
      params: {
        ...{
          voc: _.get(scheme, "uri", ""),
          limit: limit,
          count: limit, // Some endpoints use count instead of limit
          use,
          type: types.join("|"),
          sort,
        },
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
    if (!this.api.types) {
      throw new errors.MissingApiUrlError()
    }
    if (Array.isArray(this.api.types)) {
      return this.api.types
    }
    if (scheme && scheme.uri) {
      _.set(config, "params.uri", scheme.uri)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.api.types,
    })
  }

}

ConceptApiProvider.providerName = "ConceptApi"

module.exports = ConceptApiProvider
