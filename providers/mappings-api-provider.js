const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("lodash")

// TODO!!!

/**
 * For APIs that provide concordances and mappings in JSKOS format.
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

  /**
   * Saves a mapping with http post or http put. Returns a Promise with the saved mapping.
   *
   * @param {*} mapping
   * @param {*} original
   */
  _saveMapping(mapping, original) {
    mapping = jskos.minifyMapping(mapping)
    mapping = jskos.addMappingIdentifiers(mapping)
    let uri = _.get(original, "uri")
    if (uri) {
      // If there is a URI, use PUT to update the mapping.
      return this.put(uri, mapping)
    } else {
      // Otherwise, use POST to save the mapping.
      return this.post(this.registry.mappings, mapping)
    }
  }

  /**
   * Removes a mapping with http delete. Returns a Promise with a boolean whether removal was successful.
   */
  _removeMapping(mapping) {
    let uri = _.get(mapping, "uri")
    if (uri) {
      return this.delete(uri).then(result => result === undefined ? false : true)
    } else {
      return Promise.resolve(false)
    }
  }

  /**
   * Adds a new annotation with http POST.
   */
  _addAnnotation(annotation) {
    return this.post(this.registry.annotations, annotation)
  }

  /**
   * Edits an annotation. If patch is given, http PATCH will be used, otherwise PUT.
   */
  _editAnnotation(annotation, patch) {
    let uri = _.get(annotation, "id")
    if (uri) {
      if (patch) {
        return this.patch(uri, patch)
      } else {
        return this.put(uri, annotation)
      }
    } else {
      return Promise.resolve(null)
    }
  }

  /**
   * Removes an annotation with http DELETE. Returns a Promise with a boolean whether removal was successful.
   */
  _removeAnnotation(annotation) {
    let uri = _.get(annotation, "id")
    if (uri) {
      return this.delete(uri).then(result => result === undefined ? false : true)
    } else {
      return Promise.resolve(false)
    }
  }

  /**
   * Returns a promise with a list of concordances.
   */
  _getConcordances() {
    if (!this.registry.concordances) {
      return Promise.resolve([])
    }
    return this.get(this.registry.concordances).then(concordances => {
      return concordances
    })
  }
}

MappingsApiProvider.providerName = "MappingsApi"
MappingsApiProvider.stored = true

module.exports = MappingsApiProvider
