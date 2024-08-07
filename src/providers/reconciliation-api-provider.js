import BaseProvider from "./base-provider.js"
import jskos from "jskos-tools"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"

// Cache by registry URI
const cache = {}

// TODO: Document namespace etc.

/**
 * Reconciliation Service API.
 *
 * This class provides access to the [Reconciliation Service API](https://reconciliation-api.github.io/specs/).
 *
 * To use it in a registry, specify `provider` as "ReconciliationApi", provide the API base URL as `api`, and the compatible scheme or schemes in `schemes`:
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/wikidata-reconciliation",
 *  "provider": "ReconciliationApi",
 *  "api": "https://tools.wmflabs.org/openrefine-wikidata/{language}/api",
 *  "schemes": [
 *    {
 *      "uri": "http://bartoc.org/en/node/1940"
 *    }
 *  ],
 * }
 * ```
 *
 * The string `{language}` in `api` will be replaced with the queried language for the reconciliation request.
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ReconciliationApiProvider extends BaseProvider {
  static supports = {
    mappings: true,
  }

  get _cache() {
    return cache[this.uri]
  }

  /**
   * @private
   */
  _prepare() {
    cache[this.uri] = []
  }

  /**
   * Returns a list of mappings suggestions.
   *
   * @param {Object} config
   * @param {Object} config.from JSKOS concept on from side
   * @param {Object} config.to JSKOS concept on to side
   * @param {Object} config.mode mappings mode
   * @returns {Object[]} array of JSKOS mapping objects
   */
  async getMappings({ from, to, mode, ...config }) {
    let schemes = []
    if (_.isArray(this.schemes)) {
      schemes = this.schemes
    }
    let swap
    let concept
    let fromConceptScheme = _.get(from, "inScheme[0]")
    let toConceptScheme = _.get(to, "inScheme[0]")
    let fromScheme
    let toScheme
    if (!from || jskos.isContainedIn(fromConceptScheme, schemes)) {
      swap = true
      concept = to
      fromScheme = toConceptScheme
      toScheme = schemes.find(scheme => jskos.compare(scheme, fromConceptScheme)) || schemes[0]
    } else {
      swap = false
      concept = from
      fromScheme = fromConceptScheme
      toScheme = schemes.find(scheme => jskos.compare(scheme, toConceptScheme)) || schemes[0]
    }
    // Temporary to filter out GND mapping requests...
    // TODO: Remove?!?
    if (mode != "or") {
      return []
    }
    if (!this._api.api) {
      throw new errors.MissingApiUrlError()
    }
    if (!concept) {
      throw new errors.InvalidOrMissingParameterError({ parameter: swap ? "to" : "from" })
    }
    // Prepare labels
    let language = jskos.languagePreference.selectLanguage(concept.prefLabel)
    if (!language) {
      throw new errors.InvalidOrMissingParameterError({ parameter: swap ? "to" : "from", message: "Missing language" })
    }
    let altLabels = _.get(concept, `altLabel.${language}`, [])
    if (_.isString(altLabels)) {
      altLabels = [altLabels]
    }
    let prefLabel = _.get(concept, `prefLabel.${language}`)
    let labels = altLabels.concat([prefLabel])
    labels = [prefLabel]
    // Get results from API or cache
    let { url, data: results } = await this._getReconciliationResults({ ...config, labels, language })
    results = [].concat(...Object.values(results).map(value => value.result)).filter(r => r)
    // Sort results, first by score descending, then by match, then by length of notation
    results = results.sort((a, b) => {
      if (a.score != b.score) {
        return b.score - a.score
      }
      if (a.match != b.match) {
        if (a.match) {
          return -1
        } else {
          return 1
        }
      }
      return a.id.length - b.id.length
    })
    // Prepare namespace
    let namespace = _.get(toScheme, "namespace", "")
    // Map results to actual mappings
    let mappings = results.map(result => ({
      fromScheme,
      from: { memberSet: [concept] },
      toScheme,
      to: {
        memberSet: [
          {
            uri: namespace + result.id,
          },
        ],
      },
      type: [
        result.match ?
          "http://www.w3.org/2004/02/skos/core#exactMatch" :
          (
            result.score >= 80 ?
              "http://www.w3.org/2004/02/skos/core#closeMatch" :
              "http://www.w3.org/2004/02/skos/core#mappingRelation"
          ),
      ],
    }))
    if (swap) {
      // Swap mapping sides if only `to` was set
      mappings = mappings.map(mapping => Object.assign(mapping, {
        fromScheme: mapping.toScheme,
        from: mapping.to,
        toScheme: mapping.fromScheme,
        to: mapping.from,
      }))
    }
    mappings._url = url
    return mappings
  }

  /**
   * Internal function that either makes an API request or uses a local cache.
   *
   * @private
   *
   * @param {Object} config passthrough of config object for axios request
   * @param {string[]} labels list of labels to get results for
   * @param {string} language language of labels
   */
  async _getReconciliationResults({ labels, language, ...config }) {
    labels = labels.sort()
    // Use local cache.
    let resultsFromCache = this._cache.find(item => {
      return _.isEqual(item.labels, labels) && item.language == language
    })
    if (resultsFromCache) {
      return resultsFromCache
    }
    // Prepare queries
    let queries = {}
    let index = 0
    for (let label of labels) {
      queries[`q${index}`] = {
        query: label,
      }
      index += 1
    }
    let url = this._api.api
    if (language) {
      url = url.replace("{language}", language)
    }
    // Encode data
    const encodedData = `queries=${encodeURIComponent(JSON.stringify(queries))}`
    // Set appropriate header
    _.set(config, ["headers", "Content-Type"], "application/x-www-form-urlencoded")
    let data = await this.axios({
      ...config,
      method: "post",
      url,
      data: encodedData,
    })
    data = data || {}
    let newCacheEntry = {
      labels,
      language,
      data,
      url: `${url}${url.includes("?") ? "&" : "?"}${encodedData}`,
    }
    this._cache.push(newCacheEntry)
    // Make sure there are a maximum of 20 entries in cache
    if (this._cache.length > 20) {
      cache[this.uri] = this._cache.slice(this._cache.length - 20)
    }
    return newCacheEntry
  }

}

ReconciliationApiProvider.providerName = "ReconciliationApi"
ReconciliationApiProvider.providerType = "http://bartoc.org/api-type/reconciliation"
ReconciliationApiProvider.stored = false
