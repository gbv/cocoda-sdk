const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("lodash")

/**
 * For APIs that provide concordances and mappings in JSKOS format.
 *
 * TODO: Check capabilities (`this.has`) and authorization (`this.isAuthorizedFor`) before actions.
 */
class MappingsApiProvider extends BaseProvider {

  _setup() {
    this.has.mappings = this.registry.mappings ? {} : false
    if (this.has.mappings) {
      this.has.mappings.read = !!_.get(this.registry, "config.mappings.read", true)
      this.has.mappings.create = !!_.get(this.registry, "config.mappings.create")
      this.has.mappings.update = !!_.get(this.registry, "config.mappings.update")
      this.has.mappings.delete = !!_.get(this.registry, "config.mappings.delete")
      this.has.mappings.anonymous = !!_.get(this.registry, "config.mappings.anonymous")
    }
    this.has.concordances = !!this.registry.concordances
    this.has.annotations = this.registry.annotations ? {} : false
    if (this.has.annotations) {
      this.has.annotations.read = !!_.get(this.registry, "config.annotations.read")
      this.has.annotations.create = !!_.get(this.registry, "config.annotations.create")
      this.has.annotations.update = !!_.get(this.registry, "config.annotations.update")
      this.has.annotations.delete = !!_.get(this.registry, "config.annotations.delete")
    }
    this.has.auth = _.get(this.registry, "config.auth.key") != null
  }

  async _getMapping({ mapping, ...config }) {
    return this._getMappings({
      ...config,
      uri: mapping.uri,
    })
  }

  /**
   * Returns a Promise with a list of mappings from a jskos-server.
   */
  async _getMappings({ from, fromScheme, to, toScheme, creator, type, partOf, offset, limit, direction, mode, identifier, uri, sort, order, ...config }) {
    let params = {}, url = this.registry.mappings
    if (!uri) {
      if (from) {
        params.from = _.isString(from) ? from : from.uri
      }
      if (fromScheme) {
        params.fromScheme = _.isString(fromScheme) ? fromScheme : fromScheme.uri
      }
      if (to) {
        params.to = _.isString(to) ? to : to.uri
      }
      if (toScheme) {
        params.toScheme = _.isString(toScheme) ? toScheme : toScheme.uri
      }
      if (creator) {
        params.creator = _.isString(creator) ? creator : jskos.prefLabel(creator)
      }
      if (type) {
        params.type = _.isString(type) ? type : type.uri
      }
      if (partOf) {
        params.partOf = _.isString(partOf) ? partOf : partOf.uri
      }
      if (offset) {
        params.offset = offset
      }
      if (limit) {
        params.limit = limit
      }
      if (direction) {
        params.direction = direction
      }
      if (mode) {
        params.mode = mode
      }
      if (identifier) {
        params.identifier = identifier
      }
      if (sort) {
        params.sort = sort
      }
      if (order) {
        params.order = order
      }
    } else {
      // Load single mapping directly from URI if it comes from the current registry
      if (uri.startsWith(this.registry.mappings)) {
        url = uri
      } else {
        params.identifier = uri
      }
    }
    return this.axios({
      ...config,
      method: "get",
      url,
      params,
    })
  }

  async _postMapping({ mapping, ...config }) {
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    return this.axios({
      ...config,
      method: "post",
      url: this.registry.mappings,
      data: mapping,
    })
  }

  async _putMapping({ mapping, ...config }) {
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.registry.mappings)) {
      throw new Error("Invalid URI for PUT request.")
    }
    return this.axios({
      ...config,
      method: "put",
      url: uri,
      data: mapping,
    })
  }

  async _patchMapping({ mapping, ...config }) {
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.registry.mappings)) {
      throw new Error("Invalid URI for PATCH request.")
    }
    return this.axios({
      ...config,
      method: "patch",
      url: uri,
      data: mapping,
    })
  }

  async _deleteMapping({ mapping, ...config }) {
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.registry.mappings)) {
      throw new Error("Invalid URI for DELETE request.")
    }
    return this.axios({
      ...config,
      method: "delete",
      url: uri,
    })
  }

  async _getAnnotations({ target, ...config }) {
    if (target) {
      _.set(config, "params.target", target)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.registry.annotations,
    })
  }

  async _postAnnotation({ annotation, ...config }) {
    return this.axios({
      ...config,
      method: "post",
      url: this.registry.annotations,
      data: annotation,
    })
  }

  async _putAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.registry.annotations)) {
      throw new Error("Invalid URI for PUT request.")
    }
    return this.axios({
      ...config,
      method: "put",
      url: uri,
      data: annotation,
    })
  }

  async _patchAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.registry.annotations)) {
      throw new Error("Invalid URI for PATCH request.")
    }
    return this.axios({
      ...config,
      method: "patch",
      url: uri,
      data: annotation,
    })
  }

  async _deleteAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.registry.annotations)) {
      throw new Error("Invalid URI for DELETE request.")
    }
    return this.axios({
      ...config,
      method: "delete",
      url: uri,
    })
  }

  async _getConcordances(config) {
    return this.axios({
      ...config,
      method: "get",
      url: this.registry.concordances,
    })
  }

}

MappingsApiProvider.providerName = "MappingsApi"
MappingsApiProvider.stored = true

module.exports = MappingsApiProvider
