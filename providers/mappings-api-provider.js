const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("../utils/lodash")
const errors = require("../errors")
const utils = require("../utils")

// TODO: Check capabilities (`this.has`) and authorization (`this.isAuthorizedFor`) before actions.

/**
 * JSKOS Mappings API.
 *
 * This class provides access to concept mappings via JSKOS API in [JSKOS format](https://gbv.github.io/jskos/).
 * See [jskos-server](https://github.com/gbv/jskos-server) for a JSKOS API reference implementation
 *
 * To use it in a registry, specify `provider` as "MappingsApi" and provide the API base URL as `api`:
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/coli-conc-mappings",
 *  "provider": "MappingsApi",
 *  "api": "https://coli-conc.gbv.de/api/"
 * }
 * ```
 *
 * If the `/status` endpoint can be queried, the remaining API methods will be taken from that. As a fallback, the default endpoints will be appended to `api`.
 *
 * Alternatively, you can provide the endpoints separately: `status`, `mappings`, `concordances`, `annotations`
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
class MappingsApiProvider extends BaseProvider {

  /**
   * @private
   */
  _prepare() {
    // Fill `this.api` if necessary
    if (this.api.api) {
      const endpoints = {
        status: "/status",
        mappings: "/mappings",
        concordances: "/concordances",
        annotations: "/annotations",
      }
      for (let key of Object.keys(endpoints)) {
        if (!this.api[key]) {
          this.api[key] = utils.concatUrl(this.api.api, endpoints[key])
        }
      }
    }
  }

  /**
   * @private
   */
  _setup() {
    this.has.mappings = this.api.mappings ? {} : false
    if (this.has.mappings) {
      this.has.mappings.read = !!_.get(this.config, "mappings.read", true)
      this.has.mappings.create = !!_.get(this.config, "mappings.create")
      this.has.mappings.update = !!_.get(this.config, "mappings.update")
      this.has.mappings.delete = !!_.get(this.config, "mappings.delete")
      this.has.mappings.anonymous = !!_.get(this.config, "mappings.anonymous")
    }
    this.has.concordances = !!this.api.concordances
    this.has.annotations = this.api.annotations ? {} : false
    if (this.has.annotations) {
      this.has.annotations.read = !!_.get(this.config, "annotations.read")
      this.has.annotations.create = !!_.get(this.config, "annotations.create")
      this.has.annotations.update = !!_.get(this.config, "annotations.update")
      this.has.annotations.delete = !!_.get(this.config, "annotations.delete")
    }
    this.has.auth = _.get(this.config, "auth.key") != null
  }

  /**
   * Returns a single mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   * @returns {Object} JSKOS mapping object
   */
  async getMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    if (!mapping.uri || !mapping.uri.startsWith(this.api.mappings)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
    }
    return this.axios({
      ...config,
      url: mapping.uri,
    })
  }

  /**
   * Returns a list of mappings.
   *
   * @param {Object} config request config with parameters
   * @returns {Object[]} array of JSKOS mapping objects
   */
  async getMappings({ from, fromScheme, to, toScheme, creator, type, partOf, offset, limit, direction, mode, identifier, sort, order, ...config }) {
    let params = {}, url = this.api.mappings
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
   * @returns {Object} JSKOS mapping object
   */
  async postMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    return this.axios({
      ...config,
      method: "post",
      url: this.api.mappings,
      data: mapping,
    })
  }

  /**
   * Overwrites a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   * @returns {Object} JSKOS mapping object
   */
  async putMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.api.mappings)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
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
   * @returns {Object} JSKOS mapping object
   */
  async patchMapping({ mapping, ...config }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.api.mappings)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
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
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    const uri = mapping.uri
    if (!uri || !uri.startsWith(this.api.mappings)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "URI doesn't seem to be part of this registry." })
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
   * @returns {Object[]} array of JSKOS annotation objects
   */
  async getAnnotations({ target, ...config }) {
    if (target) {
      _.set(config, "params.target", target)
    }
    return this.axios({
      ...config,
      method: "get",
      url: this.api.annotations,
    })
  }

  /**
   * Creates an annotation.
   *
   * @param {Object} config
   * @param {Object} config.annotation JSKOS annotation
   * @returns {Object} JSKOS annotation object
   */
  async postAnnotation({ annotation, ...config }) {
    return this.axios({
      ...config,
      method: "post",
      url: this.api.annotations,
      data: annotation,
    })
  }

  /**
   * Overwrites an annotation.
   *
   * @param {Object} config
   * @param {Object} config.annotation JSKOS annotation
   * @returns {Object} JSKOS annotation object
   */
  async putAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.api.annotations)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "annotation", message: "URI doesn't seem to be part of this registry." })
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
   * @returns {Object} JSKOS annotation object
   */
  async patchAnnotation({ annotation, ...config }) {
    const uri = annotation.id
    if (!uri || !uri.startsWith(this.api.annotations)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "annotation", message: "URI doesn't seem to be part of this registry." })
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
    if (!uri || !uri.startsWith(this.api.annotations)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "annotation", message: "URI doesn't seem to be part of this registry." })
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
   * @returns {Object[]} array of JSKOS concordance objects
   */
  async getConcordances(config) {
    return this.axios({
      ...config,
      method: "get",
      url: this.api.concordances,
    })
  }

}

MappingsApiProvider.providerName = "MappingsApi"
MappingsApiProvider.stored = true

module.exports = MappingsApiProvider
