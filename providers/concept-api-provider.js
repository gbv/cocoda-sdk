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
      method: "get",
      url: this.registry.schemes,
      ...config,
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
      method: "get",
      url: this.registry.top,
      ...config,
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
      method: "get",
      url: this.registry.data,
      ...config,
    })
  }

  _getNarrower(concept) {
    if (!this.registry.narrower || !concept || !concept.uri) {
      return Promise.resolve([])
    }
    let options = {
      params: {
        uri: concept.uri,
        properties: this.properties.default,
        limit: 10000,
      },
    }
    return this.get(this.registry.narrower, options).then(narrower => narrower || [])
  }

  _getAncestors(concept) {
    if (!this.registry.ancestors || !concept || !concept.uri) {
      return Promise.resolve([])
    }
    let options = {
      params: {
        uri: concept.uri,
        properties: this.properties.default,
      },
    }
    return this.get(this.registry.ancestors, options).then(ancestors => ancestors || [])
  }

  _suggest(search, { scheme, limit, use = "notation,label", types = [], sort = "score", cancelToken } = {}) {
    limit = limit || this.registry.suggestResultLimit || 100
    if (!this.registry.suggest || !search) {
      return Promise.resolve(["", [], [], []])
    }
    let options = {
      params: {
        search: search,
        voc: _.get(scheme, "uri", ""),
        limit: limit,
        count: limit, // Some endpoints use count instead of limit
        use,
        type: types.join("|"),
        sort,
      },
    }
    // Some registries use URL templates with {searchTerms}
    let url = this.registry.suggest.replace("{searchTerms}", search)
    return this.get(url, options, cancelToken).then(result => result || ["", [], [], []])
  }

  /**
   * Search not yet implemented.
   */
  _search() {
    return Promise.resolve([])
  }

  _getTypes(scheme) {
    if (!this.registry.types) {
      return Promise.resolve([])
    }
    if (Array.isArray(this.registry.types)) {
      return Promise.resolve(this.registry.types)
    }
    return this.get(this.registry.types, {
      uri: _.get(scheme, "uri"),
    }).then(types => types || [])
  }

}

ConceptApiProvider.providerName = "ConceptApi"

module.exports = ConceptApiProvider
