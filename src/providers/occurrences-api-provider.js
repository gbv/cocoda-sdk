import BaseProvider from "./base-provider.js"
import jskos from "jskos-tools"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import * as utils from "../utils/index.js"

// TODO: Modernize.

/**
 * JSKOS Occurrences API.
 *
 * This class provides access to concept occurrences via JSKOS API in [JSKOS format](https://gbv.github.io/jskos/).
 *
 * To use it in a registry, specify `provider` as "OccurrencesApi" and provide the API base URL as `api`:
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/occurrences",
 *  "provider": "OccurrencesApi",
 *  "api": "https://coli-conc.gbv.de/occurrences/api/"
 * }
 * ```
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class OccurrencesApiProvider extends BaseProvider {

  /**
   * @private
   */
  _prepare() {
    this._cache = []
    this._occurrencesSupportedSchemes = []
    this.has.occurrences = true
    this.has.mappings = true
    // Explicitly set other capabilities to false
    utils.listOfCapabilities.filter(c => !this.has[c]).forEach(c => {
      this.has[c] = false
    })
  }

  /**
   * Returns whether a concept scheme is supported for occurrences.
   *
   * @private
   *
   * @param {Object} scheme JSKOS scheme to query
   */
  async _occurrencesIsSupported(scheme) {
    if (this._occurrencesSupportedSchemes && this._occurrencesSupportedSchemes.length) {
      // No action needed
    } else {
      // Load supported schemes from API
      try {
        const url = utils.concatUrl(this._api.api, "voc")
        const data = await this.axios({
          method: "get",
          url,
        })
        this._occurrencesSupportedSchemes = data || []
      } catch (error) {
        // Do nothing so that it is tried again next time
        // TODO: Save number of failures?
      }
    }
    let supported = false
    for (let supportedScheme of this._occurrencesSupportedSchemes) {
      if (jskos.compare(scheme, supportedScheme)) {
        supported = true
      }
    }
    return supported
  }

  /**
   * Wrapper around getOccurrences that converts occurrences into mappings.
   *
   * @param {Object} config config object for getOccurrences request
   * @returns {Object[]} array of JSKOS mapping objects
   */
  async getMappings(config) {
    const occurrences = await this.getOccurrences(config)
    const fromScheme = _.get(config, "from.inScheme[0]") || config.fromScheme
    const toScheme = _.get(config, "to.inScheme[0]") || config.toScheme
    const mappings = []
    // Convert occurrences to mappings
    for (let occurrence of occurrences) {
      if (!occurrence) {
        continue
      }
      let mapping = {}
      mapping.from = _.get(occurrence, "memberSet[0]")
      if (mapping.from) {
        mapping.from = { memberSet: [mapping.from] }
      } else {
        mapping.from = null
      }
      mapping.fromScheme = _.get(occurrence, "memberSet[0].inScheme[0]")
      mapping.to = _.get(occurrence, "memberSet[1]")
      if (mapping.to) {
        mapping.to = { memberSet: [mapping.to] }
      } else {
        mapping.to = { memberSet: [] }
      }
      mapping.toScheme = _.get(occurrence, "memberSet[1].inScheme[0]")
      // Swap sides if necessary
      if ((fromScheme && mapping.fromScheme && !jskos.compare(mapping.fromScheme, fromScheme)) || (toScheme && mapping.toScheme && !jskos.compare(mapping.toScheme, toScheme))) {
        [mapping.from, mapping.fromScheme, mapping.to, mapping.toScheme] = [mapping.to, mapping.toScheme, mapping.from, mapping.fromScheme]
      }
      // Set fromScheme/toScheme if necessary
      if (!mapping.fromScheme && fromScheme) {
        mapping.fromScheme = fromScheme
      }
      if (!mapping.toScheme && toScheme) {
        mapping.toScheme = toScheme
      }
      mapping.type = [jskos.defaultMappingType.uri]
      mapping._occurrence = occurrence
      mapping = jskos.addMappingIdentifiers(mapping)
      mappings.push(mapping)
    }
    mappings._url = occurrences._url
    return mappings
  }

  /**
   * Returns a list of occurrences.
   *
   * @param {Object} config
   * @param {Object} [config.from] JSKOS concept to load occurrences for (from side)
   * @param {Object} [config.to] JSKOS concept to load occurrences for (to side)
   * @param {Object[]} [config.concepts] list of JSKOS concepts to load occurrences for
   * @returns {Object[]} array of JSKOS occurrence objects
   */
  async getOccurrences({ from, to, concepts, ...config }) {
    let promises = []
    concepts = (concepts || []).concat([from, to]).filter(c => !!c)
    for (let concept of concepts) {
      promises.push(this._occurrencesIsSupported(_.get(concept, "inScheme[0]")).then(supported => {
        if (supported && concept.uri) {
          return concept.uri
        } else {
          return null
        }
      }))
    }
    let uris = await Promise.all(promises)
    uris = uris.filter(uri => uri != null)
    if (uris.length == 0) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concepts" })
    }
    promises = []
    for (let uri of uris) {
      promises.push(this._getOccurrences({
        ...config,
        params: {
          member: uri,
          scheme: "*",
          threshold: 5,
        },
      }))
    }
    // Another request for co-occurrences between two specific concepts
    // TODO: Currently unsupported and therefore removed (2022-08-03)
    // if (uris.length > 1) {
    //   let urisString = uris.join(" ")
    //   promises.push(this._getOccurrences({
    //     ...config,
    //     params: {
    //       member: urisString,
    //       threshold: 5,
    //     },
    //   }))
    // }
    const results = await Promise.all(promises)
    let occurrences = _.concat([], ...results)
    // Filter duplicates
    let existingUris = []
    let indexesToDelete = []
    for (let i = 0; i < occurrences.length; i += 1) {
      let occurrence = occurrences[i]
      if (!occurrence) {
        continue
      }
      let uris = occurrence.memberSet.reduce((total, current) => total.concat(current.uri), []).sort().join(" ")
      if (existingUris.includes(uris)) {
        indexesToDelete.push(i)
      } else {
        existingUris.push(uris)
      }
    }
    indexesToDelete.forEach(value => {
      delete occurrences[value]
    })
    // Filter null values
    occurrences = occurrences.filter(o => o != null)
    // Sort occurrences
    occurrences = occurrences.sort((a, b) => parseInt(b.count || 0) - parseInt(a.count || 0))
    // Add URL(s)
    occurrences._url = results.map(result => result._url)

    return occurrences
  }

  /**
   * Internal function for getOccurrences that either makes an API request or uses a local cache.
   *
   * @private
   *
   * @param {Object} config passthrough of config parameter for axios request
   */
  async _getOccurrences(config) {
    // Use local cache.
    let resultsFromCache = this._cache.find(item => {
      return _.isEqual(item.config.params, config.params)
    })
    if (resultsFromCache) {
      return resultsFromCache.data
    }
    const data = await this.axios({
      ...config,
      method: "get",
      url: this._api.api,
    })
    this._cache.push({
      config,
      data,
    })
    if (this._cache.length > 20) {
      this._cache = this._cache.slice(this._cache.length - 20)
    }
    return data
  }
}

OccurrencesApiProvider.providerName = "OccurrencesApi"
OccurrencesApiProvider.stored = false
