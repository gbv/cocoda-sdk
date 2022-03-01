import BaseProvider from "./base-provider.js"
import jskos from "jskos-tools"
import * as _ from "../utils/lodash.js"
import localforage from "localforage"
import { v4 as uuid } from "uuid"
import * as errors from "../errors/index.js"
import { listOfCapabilities } from "../utils/index.js"
const uriPrefix = "urn:uuid:"

/**
 * Local Mappings.
 *
 * This class provides read-write access to mappings in the browser's local storage.
 *
 * To use it in a registry, specify `provider` as "LocalMappings":
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/local-mappings",
 *  "provider": "LocalMappings"
 * }
 * ```
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class LocalMappingsProvider extends BaseProvider {

  /**
   * @private
   */
  _prepare() {
    this.has.mappings = {
      read: true,
      create: true,
      update: true,
      delete: true,
    }
    // Explicitly set other capabilities to false
    listOfCapabilities.filter(c => !this.has[c]).forEach(c => {
      this.has[c] = false
    })
  }

  /**
   * @private
   */
  _setup() {
    this.queue = []
    this.localStorageKey = "cocoda-mappings--" + this._path
    let oldLocalStorageKey = "mappings"
    // Function that adds URIs to all existing local mappings that don't yet have one
    let addUris = () => {
      return localforage.getItem(this.localStorageKey).then(mappings => {
        mappings = mappings || []
        let adjusted = 0
        for (let mapping of mappings.filter(m => !m.uri || !m.uri.startsWith(uriPrefix))) {
          if (mapping.uri) {
            // Keep previous URI in identifier
            if (!mapping.identifier) {
              mapping.identifier = []
            }
            mapping.identifier.push(mapping.uri)
          }
          mapping.uri = `${uriPrefix}${uuid()}`
          adjusted += 1
        }
        if (adjusted) {
          console.warn(`URIs added to ${adjusted} local mappings.`)
        }
        return localforage.setItem(this.localStorageKey, mappings)
      })
    }
    // Show warning if there are mappings in local storage that use the old local storage key.
    localforage.getItem(oldLocalStorageKey).then(results => {
      if (results) {
        console.warn(`Warning: There is old data in local storage (or IndexedDB, depending on the ) with the key "${oldLocalStorageKey}". This data will not be used anymore. A manual export is necessary to get this data back.`)
      }
    })
    // Put promise into queue so that getMappings requests are waiting for adjustments to finish
    this.queue.push(
      addUris().catch(error => {
        console.warn("Error when adding URIs to local mappings:", error)
      }),
    )
  }

  isAuthorizedFor({ type, action }) {
    // Allow all for mappings
    if (type == "mappings" && action != "anonymous") {
      return true
    }
    return false
  }

  /**
   * Returns a Promise that returns an object { mappings, done } with the local mappings and a done function that is supposed to be called when the transaction is finished.
   * This prevents conflicts when saveMapping is called multiple times simultaneously.
   *
   * TODO: There might be a better solution for this...
   *
   * @private
   */
  _getMappingsQueue() {
    let last = _.last(this.queue) || Promise.resolve()
    return new Promise((resolve) => {
      function defer() {
        var res, rej

        var promise = new Promise((resolve, reject) => {
          res = resolve
          rej = reject
        })

        promise.resolve = res
        promise.reject = rej

        return promise
      }
      let promise = defer()
      let done = () => {
        promise.resolve()
      }
      this.queue.push(promise)

      last.then(() => {
        return localforage.getItem(this.localStorageKey)
      }).then(mappings => {
        resolve({ mappings, done })
      })
    })
  }

  /**
   * Returns a single mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   * @returns {Object} JSKOS mapping object
   */
  async getMapping({ mapping, ...config }) {
    config._raw = true
    if (!mapping || !mapping.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    return (await this.getMappings({ ...config, uri: mapping.uri }))[0]
  }

  /**
   * Returns a list of local mappings.
   *
   * TODO: Add support for sort (`created` or `modified`) and order (`asc` or `desc`).
   * TODO: Clean up and use async/await
   *
   * @returns {Object[]} array of JSKOS mapping objects
   */
  async getMappings({ from, fromScheme, to, toScheme, creator, type, partOf, offset, limit, direction, mode, identifier, uri } = {}) {
    let params = {}
    if (from) {
      params.from = _.isString(from) ? from : from.uri
    }
    if (fromScheme) {
      params.fromScheme = _.isString(fromScheme) ? { uri: fromScheme } : fromScheme
    }
    if (to) {
      params.to = _.isString(to) ? to : to.uri
    }
    if (toScheme) {
      params.toScheme = _.isString(toScheme) ? { uri: toScheme } : toScheme
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
    if (uri) {
      params.uri = uri
    }
    return this._getMappingsQueue().catch(relatedError => {
      throw new errors.CDKError({ message: "Could not get mappings from local storage", relatedError })
    }).then(({ mappings, done }) => {
      done()
      // Check concept with param
      let checkConcept = (concept, param) => concept.uri == param || (param && concept.notation && concept.notation[0].toLowerCase() == param.toLowerCase())
      // Filter mappings according to params (support for from + to)
      // TODO: - Support more parameters.
      // TODO: - Move to its own things.
      // TODO: - Clean all this up.
      if (params.from || params.to) {
        mappings = mappings.filter(mapping => {
          let fromInFrom = null != jskos.conceptsOfMapping(mapping, "from").find(concept => checkConcept(concept, params.from))
          let fromInTo = null != jskos.conceptsOfMapping(mapping, "to").find(concept => checkConcept(concept, params.from))
          let toInFrom = null != jskos.conceptsOfMapping(mapping, "from").find(concept => checkConcept(concept, params.to))
          let toInTo = null != jskos.conceptsOfMapping(mapping, "to").find(concept => checkConcept(concept, params.to))
          if (params.direction == "backward") {
            if (params.mode == "or") {
              return (params.from && fromInTo) || (params.to && toInFrom)
            } else {
              return (!params.from || fromInTo) && (!params.to || toInFrom)
            }
          } else if (params.direction == "both") {
            if (params.mode == "or") {
              return (params.from && (fromInFrom || fromInTo)) || (params.to && (toInFrom || toInTo))
            } else {
              return ((!params.from || fromInFrom) && (!params.to || toInTo)) || ((!params.from || fromInTo) && (!params.to || toInFrom))
            }
          } else {
            if (params.mode == "or") {
              return (params.from && fromInFrom) || (params.to && toInTo)
            } else {
              return (!params.from || fromInFrom) && (!params.to || toInTo)
            }
          }
        })
      }
      if (params.fromScheme || params.toScheme) {
        mappings = mappings.filter(mapping => {
          let fromInFrom = jskos.compare(mapping.fromScheme, params.fromScheme)
          let fromInTo = jskos.compare(mapping.toScheme, params.fromScheme)
          let toInFrom = jskos.compare(mapping.fromScheme, params.toScheme)
          let toInTo = jskos.compare(mapping.toScheme, params.toScheme)
          if (params.direction == "backward") {
            if (params.mode == "or") {
              return (params.fromScheme && fromInTo) || (params.toScheme && toInFrom)
            } else {
              return (!params.fromScheme || fromInTo) && (!params.toScheme || toInFrom)
            }
          } else if (params.direction == "both") {
            if (params.mode == "or") {
              return (params.fromScheme && (fromInFrom || fromInTo)) || (params.toScheme && (toInFrom || toInTo))
            } else {
              return ((!params.fromScheme || fromInFrom) && (!params.toScheme || toInTo)) || ((!params.fromScheme || fromInTo) && (!params.toScheme || toInFrom))
            }
          } else {
            if (params.mode == "or") {
              return (params.fromScheme && fromInFrom) || (params.toScheme && toInTo)
            } else {
              return (!params.fromScheme || fromInFrom) && (!params.toScheme || toInTo)
            }
          }
        })
      }
      // creator
      if (params.creator) {
        let creators = params.creator.split("|")
        mappings = mappings.filter(mapping => {
          return (mapping.creator && mapping.creator.find(creator => creators.includes(jskos.prefLabel(creator)) || creators.includes(creator.uri))) != null
        })
      }
      // type
      if (params.type) {
        mappings = mappings.filter(mapping => (mapping.type || [jskos.defaultMappingType.uri]).includes(params.type))
      }
      // concordance
      if (params.partOf) {
        mappings = mappings.filter(mapping => {
          return mapping.partOf != null && mapping.partOf.find(partOf => jskos.compare(partOf, { uri: params.partOf })) != null
        })
      }
      // identifier
      if (params.identifier) {
        mappings = mappings.filter(mapping => {
          return params.identifier.split("|").map(identifier => {
            return (mapping.identifier || []).includes(identifier) || mapping.uri == identifier
          }).reduce((current, total) => current || total)
        })
      }
      if (params.uri) {
        mappings = mappings.filter(mapping => mapping.uri == params.uri)
      }
      let totalCount = mappings.length
      // Sort mappings (default: modified/created date descending)
      mappings = mappings.sort((a, b) => {
        let aDate = a.modified || a.created
        let bDate = b.modified || b.created
        if (bDate == null) {
          return -1
        }
        if (aDate == null) {
          return 1
        }
        if (aDate > bDate) {
          return -1
        }
        return 1
      })
      mappings = mappings.slice(params.offset || 0)
      mappings = mappings.slice(0, params.limit)
      mappings._totalCount = totalCount
      return mappings
    })
  }

  /**
   * Creates a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   * @returns {Object} JSKOS mapping object
   */
  async postMapping({ mapping }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    let { mappings: localMappings, done } = await this._getMappingsQueue()
    // Set URI if necessary
    if (!mapping.uri || !mapping.uri.startsWith(uriPrefix)) {
      if (mapping.uri) {
        // Keep previous URI in identifier
        if (!mapping.identifier) {
          mapping.identifier = []
        }
        mapping.identifier.push(mapping.uri)
      }
      mapping.uri = `${uriPrefix}${uuid()}`
    }
    // Check if mapping already exists => throw error
    if (localMappings.find(m => m.uri == mapping.uri)) {
      done()
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "Duplicate URI" })
    }
    // Set created/modified
    if (!mapping.created) {
      mapping.created = (new Date()).toISOString()
    }
    if (!mapping.modified) {
      mapping.modified = mapping.created
    }
    // Add to local mappings
    localMappings.push(mapping)
    // Minify mappings before saving back to local storage
    localMappings = localMappings.map(mapping => jskos.minifyMapping(mapping))
    // Write local mappings
    try {
      await localforage.setItem(this.localStorageKey, localMappings)
      done()
      return mapping
    } catch (error) {
      done()
      throw error
    }
  }

  /**
   * Overwrites a mapping.
   *
   * @param {Object} config
   * @param {Object} config.mapping JSKOS mapping
   * @returns {Object} JSKOS mapping object
   */
  async putMapping({ mapping }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    let { mappings: localMappings, done } = await this._getMappingsQueue()
    // Check if mapping already exists => throw error if it doesn't
    const index = localMappings.findIndex(m => m.uri == mapping.uri)
    if (index == -1) {
      done()
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "Mapping not found" })
    }
    // Set created/modified
    if (!mapping.created) {
      mapping.created = localMappings[index].created
    }
    mapping.modified = (new Date()).toISOString()
    // Add to local mappings
    localMappings[index] = mapping
    // Minify mappings before saving back to local storage
    localMappings = localMappings.map(mapping => jskos.minifyMapping(mapping))
    // Write local mappings
    try {
      await localforage.setItem(this.localStorageKey, localMappings)
      done()
      return mapping
    } catch (error) {
      done()
      throw error
    }
  }

  /**
   * Patches a mapping.
   *
   * @param {Object} config
   * @param {Object} mapping JSKOS mapping (or part of mapping)
   * @returns {Object} JSKOS mapping object
   */
  async patchMapping({ mapping }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    let { mappings: localMappings, done } = await this._getMappingsQueue()
    // Check if mapping already exists => throw error if it doesn't
    const index = localMappings.findIndex(m => m.uri == mapping.uri)
    if (index == -1) {
      done()
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping", message: "Mapping not found" })
    }
    // Set created/modified
    if (!mapping.created) {
      mapping.created = localMappings[index].created
    }
    mapping.modified = (new Date()).toISOString()
    // Add to local mappings
    localMappings[index] = Object.assign(localMappings[index], mapping)
    // Minify mappings before saving back to local storage
    localMappings = localMappings.map(mapping => jskos.minifyMapping(mapping))
    // Write local mappings
    try {
      await localforage.setItem(this.localStorageKey, localMappings)
      done()
      return mapping
    } catch (error) {
      done()
      throw error
    }
  }

  /**
   * Removes a mapping from local storage.
   *
   * @param {Object} config
   * @param {Object} mapping JSKOS mapping
   * @returns {boolean} boolean whether deleting the mapping was successful
   */
  async deleteMapping({ mapping }) {
    if (!mapping) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mapping" })
    }
    let { mappings: localMappings, done } = await this._getMappingsQueue()
    try {
      // Remove by URI
      localMappings = localMappings.filter(m => m.uri != mapping.uri)
      // Minify mappings before saving back to local storage
      localMappings = localMappings.map(mapping => jskos.minifyMapping(mapping))
      await localforage.setItem(this.localStorageKey, localMappings)
      done()
      return true
    } catch (error) {
      done()
      throw error
    }
  }
}

LocalMappingsProvider.providerName = "LocalMappings"
LocalMappingsProvider.stored = true
