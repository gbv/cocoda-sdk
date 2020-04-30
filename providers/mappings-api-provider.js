const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("lodash")
const CDKError = require("../lib/CDKError")

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

  /**
   * Returns a single mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   */
  async getMapping({ mapping, ...config }) {
    return this.getMappings({
      ...config,
      uri: mapping.uri,
      _raw: true,
    })
  }

  /**
   * Returns a list of mappings.
   *
   * @param {Object} config request config with parameters
   */
  async getMappings({ from, fromScheme, to, toScheme, creator, type, partOf, offset, limit, direction, mode, identifier, uri, sort, order, ...config }) {
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

  /**
   * Creates a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   */
  async postMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping" })
    }
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    return this.axios({
      ...config,
      method: "post",
      url: this.registry.mappings,
      data: mapping,
    })
  }

  /**
   * Overwrites a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   */
  async putMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping" })
    }
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.registry.mappings)) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      method: "put",
      url: uri,
      data: mapping,
    })
  }

  /**
   * Patches a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping (or part of mapping)
   */
  async patchMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping" })
    }
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.registry.mappings)) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      method: "patch",
      url: uri,
      data: mapping,
    })
  }

  /**
   * Deletes a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   */
  async deleteMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping" })
    }
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.registry.mappings)) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      method: "delete",
      url: uri,
    })
  }

  /**
   * Returns a list of annotations.
   *
   * @param {Object} config
   * @param {string} [config.target] target URI
   */
  async getAnnotations({ target, ...config }) {
    if (target) {
      _.set(config, "params.target", target)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.registry.annotations,
    })
  }

  /**
   * Creates an annotation.
   *
   * @param {Object} config
   * @param {Object} config.annotation JSKOS annotation
   */
  async postAnnotation({ annotation, ...config }) {
    return this.axios({
      ...config,
      method: "post",
      url: this.registry.annotations,
      data: annotation,
    })
  }

  /**
   * Overwrites an annotation.
   *
   * @param {Object} config
   * @param {Object} config.annotation JSKOS annotation
   */
  async putAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.registry.annotations)) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "annotation", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      method: "put",
      url: uri,
      data: annotation,
    })
  }

  /**
   * Patches an annotation.
   *
   * @param {Object} config
   * @param {Object} config.annotation JSKOS annotation
   */
  async patchAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.registry.annotations)) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "annotation", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      method: "patch",
      url: uri,
      data: annotation,
    })
  }

  /**
   * Deletes an annotation.
   *
   * @param {Object} config
   * @param {Object} config.annotation JSKOS annotation
   */
  async deleteAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.registry.annotations)) {
      throw new CDKError.InvalidOrMissingParameter({ parameter: "annotation", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      method: "delete",
      url: uri,
    })
  }

  /**
   * Returns a list of concordances.
   *
   * @param {Object} config
   */
  async getConcordances(config) {
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
