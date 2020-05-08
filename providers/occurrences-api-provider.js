const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("../utils/lodash")
const errors = require("../errors")

/**
 * For APIs that provide occurrences in JSKOS format.
 *
 * TODO: Modernize.
 *
 * To use this in a registry, specific it as "OccurrencesApi":
 * ```json
 * {
 *  "provider": "OccurrencesApi"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
class OccurrencesApiProvider extends BaseProvider {

  /**
   * @private
   */
  _setup() {
    this._cache = []
    this._occurrencesSupportedSchemes = []
    this.has.occurrences = true
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
        const url = this.api.occurrences + "voc"
        const data = await this.axios({
          method: "get",
          url,
        })
        this._occurrencesSupportedSchemes = data || []
      } catch(error) {
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
    if (uris.length > 1) {
      let urisString = uris.join(" ")
      promises.push(this._getOccurrences({
        ...config,
        params: {
          member: urisString,
          threshold: 5,
        },
      }))
    }
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
    return occurrences.sort((a, b) => parseInt(b.count || 0) - parseInt(a.count || 0))
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
      url: this.api.occurrences,
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

module.exports = OccurrencesApiProvider
