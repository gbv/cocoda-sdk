const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("lodash")

/**
 * For APIs that provide occurrences in JSKOS format.
 *
 * TODO: Modernize.
 */
class OccurrencesApiProvider extends BaseProvider {

  _setup() {
    this._occurrencesCache = []
    this._occurrencesSupportedSchemes = []
    this.has.occurrences = true
  }

  async _occurrencesIsSupported(scheme) {
    if (this._occurrencesSupportedSchemes && this._occurrencesSupportedSchemes.length) {
      // No action needed
    } else {
      // Load supported schemes from API
      try {
        const url = this.registry.occurrences + "voc"
        const data = await this.axios({
          method: "get",
          url,
        })
        console.log(url)
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
   * Returns a Promise with a list of occurrences.
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
      return []
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
      }).catch(() => {
        return []
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
      }).catch(() => {
        return []
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
   * @param {*} params
   */
  async _getOccurrences(config) {
    // Use local cache.
    let resultsFromCache = this._occurrencesCache.find(item => {
      return _.isEqual(item.config.params, config.params)
    })
    if (resultsFromCache) {
      return resultsFromCache.data
    }
    const data = await this.axios({
      ...config,
      method: "get",
      url: this.registry.occurrences,
    })
    this._occurrencesCache.push({
      config,
      data,
    })
    return data
  }
}

OccurrencesApiProvider.providerName = "OccurrencesApi"
OccurrencesApiProvider.stored = false

module.exports = OccurrencesApiProvider
