const BaseProvider = require("./base-provider")
const _ = require("lodash")

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

  async _getSchemes(config) {
    if (!this.registry.schemes) {
      return []
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

  async _getTop({ scheme, ...config }) {
    // ? Should we return an empty array if scheme is not given?
    if (!this.registry.top) {
      return []
    }
    if (Array.isArray(this.registry.top)) {
      return this.registry.top
    }
    if (scheme) {
      _.set(config, "params.uri", scheme.uri)
    }
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

  async _getConcepts({ concepts, ...config }) {
    if (!this.has.data || !concepts) {
      return []
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

  async _getNarrower({ concept, ...config }) {
    if (!this.registry.narrower || !concept || !concept.uri) {
      return []
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

  async _getAncestors({ concept, ...config }) {
    if (!this.registry.ancestors || !concept || !concept.uri) {
      return []
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

  _suggest({ search, scheme, limit, use = "notation,label", types = [], sort = "score", ...config }) {
    if (!this.registry.suggest || !search) {
      return ["", [], [], []]
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
  async _search() {
    return []
  }

  async _getTypes({ scheme, ...config }) {
    if (!this.registry.types) {
      return []
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
