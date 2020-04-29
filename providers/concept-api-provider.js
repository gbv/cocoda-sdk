const BaseProvider = require("./base-provider")
const _ = require("lodash")
const CDKError = require("../lib/CDKError")

/**
 * For APIs that provide concept schemes and concepts in JSKOS format
 * like [DANTE](http://api.dante.gbv.de/).
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

  async getSchemes(config) {
    if (!this.registry.schemes) {
      throw new CDKError.MissingApiUrl()
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

  async getTop({ scheme, ...config }) {
    if (!this.registry.top) {
      throw new CDKError.MissingApiUrl()
    }
    if (!scheme) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "scheme" })
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

  async getConcepts({ concepts, ...config }) {
    if (!this.has.data) {
      throw new CDKError.MissingApiUrl()
    }
    if (!concepts) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "concepts" })
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

  async getNarrower({ concept, ...config }) {
    if (!this.registry.narrower) {
      throw new CDKError.MissingApiUrl()
    }
    if (!concept || !concept.uri) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "concept" })
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

  async getAncestors({ concept, ...config }) {
    if (!this.registry.ancestors) {
      throw new CDKError.MissingApiUrl()
    }
    if (!concept || !concept.uri) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "concept" })
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

  async suggest({ search, scheme, limit, use = "notation,label", types = [], sort = "score", ...config }) {
    if (!this.registry.suggest) {
      throw new CDKError.MissingApiUrl()
    }
    if (!search) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "search" })
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
    throw new CDKError.MethodNotImplemented({ method: "search" })
  }

  async getTypes({ scheme, ...config }) {
    if (!this.registry.types) {
      throw new CDKError.MissingApiUrl()
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
