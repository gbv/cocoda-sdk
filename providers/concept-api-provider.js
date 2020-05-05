const BaseProvider = require("./base-provider")
const _ = require("lodash")
const errors = require("../errors")

/**
 * For APIs that provide concept schemes and concepts in JSKOS format
 * like [DANTE](https://api.dante.gbv.de/) and jskos-server
 * [jskos-server](https://github.com/gbv/jskos-server).
 */
class ConceptApiProvider extends BaseProvider {

  _setup() {
    this.has.schemes = !!this.registry.schemes
    this.has.top = !!this.registry.top
    this.has.data = !!this.registry.data
    this.has.concepts = !!this.registry.concepts || this.has.data
    this.has.narrower = !!this.registry.narrower
    this.has.ancestors = !!this.registry.ancestors
    this.has.types = !!this.registry.types
    this.has.suggest = !!this.registry.suggest
    this.has.search = !!this.registry.search
  }

  /**
   * Returns all concept schemes.
   *
   * @param {Object} config
   */
  async getSchemes(config) {
    if (!this.registry.schemes) {
      throw new errors.MissingApiUrlError()
    }
    if (Array.isArray(this.registry.schemes)) {
      return this.registry.schemes
    }
    // ? Should we really do it this way?
    if (!_.get(config, "params.limit")) {
      _.set(config, "params.limit", 500)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.registry.schemes,
    })
  }

  /**
   * Returns top concepts for a concept scheme.
   *
   * @param {Object} config
   * @param {Object} config.scheme concept scheme object
   */
  async getTop({ scheme, ...config }) {
    if (!this.registry.top) {
      throw new errors.MissingApiUrlError()
    }
    if (!scheme) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    if (Array.isArray(this.registry.top)) {
      return this.registry.top
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
      url: this.registry.top,
    })
  }

  /**
   * Returns details for a list of concepts.
   *
   * @param {Object} config
   * @param {Object[]} config.concepts list of concept objects to load
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
      url: this.registry.data,
    })
  }

  /**
   * Returns narrower concepts for a concept.
   *
   * @param {Object} config
   * @param {Object} config.concept concept object
   */
  async getNarrower({ concept, ...config }) {
    if (!this.registry.narrower) {
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
      url: this.registry.narrower,
    })
  }

  /**
   * Returns ancestor concepts for a concept.
   *
   * @param {Object} config
   * @param {Object} config.concept concept object
   */
  async getAncestors({ concept, ...config }) {
    if (!this.registry.ancestors) {
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
      url: this.registry.ancestors,
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
   */
  async suggest({ search, scheme, limit, use = "notation,label", types = [], sort = "score", ...config }) {
    if (!this.registry.suggest) {
      throw new errors.MissingApiUrlError()
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    limit = limit || this.registry.suggestResultLimit || 100
    // Some registries use URL templates with {searchTerms}
    let url = this.registry.suggest.replace("{searchTerms}", search)
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
   * Search not yet implemented.
   */
  async search() {
    throw new errors.MethodNotImplementedError({ method: "search" })
  }

  /**
   * Returns a list of types.
   *
   * @param {Object} config
   * @param {Object} [config.scheme] concept scheme to load types for
   */
  async getTypes({ scheme, ...config }) {
    if (!this.registry.types) {
      throw new errors.MissingApiUrlError()
    }
    if (Array.isArray(this.registry.types)) {
      return this.registry.types
    }
    if (scheme && scheme.uri) {
      _.set(config, "params.uri", scheme.uri)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.registry.types,
    })
  }

}

ConceptApiProvider.providerName = "ConceptApi"

module.exports = ConceptApiProvider
