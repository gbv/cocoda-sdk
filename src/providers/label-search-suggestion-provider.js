import BaseProvider from "./base-provider.js"
import jskos from "jskos-tools"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"

// TODO: Only keep the last 20 results in cache.
// TODO: Try to remove dependencies on `selected`, `scheme._registry.registry.uri`, etc.

/**
 * Label search suggestion provider.
 *
 * This provider offers mapping recommendations based on label match via the `/search` endpoint of JSKOS APIs.
 *
 * The provider requires that a list of initialized registries with search endpoints is provided via `cdk` (which refers to the CDK instance that's using this provider).
 *
 * To use it in a registry, specify `provider` as "LabelSearchSuggestion":
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/coli-conc-recommendations"
 *  "provider": "LabelSearchSuggestion"
 * }
 * ```
 *
 * You can provide a list of excluded schemes as JSKOS objects in `excludedSchemes`.
 *
 * Additionally, the following JSKOS properties can be provided: `prefLabel`, `notation`, `definition`
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class LabelSearchSuggestionProvider extends BaseProvider {

  /**
   * @private
   */
  _setup() {
    this._cache = []
    this.has.mappings = true
  }

  /**
   * Override `supportsScheme` to check whether a search URI is available for the scheme's registry.
   *
   * @param {Object} scheme - target scheme to check for support
   * @returns {boolean}
   */
  supportsScheme(scheme) {
    return _.get(scheme, "_registry.has.search", false)
  }

  /**
   * Returns a list of mappings.
   *
   * @param {Object} config
   * @param {Object} config.from JSKOS concept on from side
   * @param {Object} config.to JSKOS concept on to side
   * @param {Object} config.mode mappings mode
   * @param {Object} config.selected selected mappings in Cocoda
   * @returns {Object[]} array of JSKOS mapping objects
   */
  async getMappings({ from, to, mode, selected, limit = 10, ...config }) {
    // TODO: Why mode?
    if (mode != "or") {
      return []
    }
    if (!selected) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "selected" })
    }
    let promises = []
    if (from && this.supportsScheme(selected.scheme[false])) {
      promises.push(this._getMappings({ ...config, concept: from, sourceScheme: selected.scheme[true], targetScheme: selected.scheme[false], limit }))
    } else {
      promises.push(Promise.resolve([]))
    }
    if (to && this.supportsScheme(selected.scheme[true])) {
      promises.push(this._getMappings({ ...config, concept: to, sourceScheme: selected.scheme[false], targetScheme: selected.scheme[true], limit, swap: true }))
    } else {
      promises.push(Promise.resolve([]))
    }
    let [fromResult, toResult] = await Promise.all(promises)
    // Filter all duplicates from toResult
    toResult = toResult.filter(m => !fromResult.find(n => jskos.compareMappingMembers(m, n)))
    // Reduce number of results until limit is reached
    while (fromResult.length + toResult.length > limit) {
      if (toResult.length >= fromResult.length) {
        toResult = toResult.slice(0, -1)
      } else {
        fromResult = fromResult.slice(0, -1)
      }
    }
    return _.union(fromResult, toResult)
  }

  /**
   * Internal function to get mapping recommendations for a certain concept with sourceScheme and targetScheme.
   *
   * @private
   *
   * @param {Object} config
   * @param {Object} config.concept
   * @param {Object} config.sourceScheme
   * @param {Pbject} config.targetScheme
   * @param {boolean} config.swap - whether to reverse the direction of the mappings
   */
  async _getMappings({ concept, sourceScheme, targetScheme, limit, swap = false, ...config }) {
    if (!concept || !sourceScheme || !targetScheme) {
      return []
    }
    // If source scheme is the same as target scheme, skip
    if (jskos.compare(sourceScheme, targetScheme)) {
      return []
    }
    // Prepare label
    // TODO: Can we use a language prioritiy list like for requests?
    const language = jskos.languagePreference.selectLanguage(concept.prefLabel) || this._defaultLanguages[0]
    let label = jskos.prefLabel(concept, {
      fallbackToUri: false,
      language,
    })
    if (!label) {
      return []
    }
    // Adjust prefLabel by removing everything from the first non-whitespace, non-letter character
    // (copied from Cocoda)
    const regexResult = /^[\s\wäüöÄÜÖß]*\w/.exec(label)
    label = regexResult ? regexResult[0] : label
    // Get results from API or cache
    const results = await this._getResults({ ...config, label, targetScheme, limit })
    // Map results to actual mappings
    let mappings = results.map(result => ({
      fromScheme: sourceScheme,
      from: { memberSet: [concept] },
      toScheme: targetScheme,
      to: { memberSet: [result] },
      type: ["http://www.w3.org/2004/02/skos/core#mappingRelation"],
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
    return mappings
  }

  /**
   * Internal function that either makes an API request or uses a local cache.
   *
   * @private
   *
   * @param {Object} config
   * @param {string} config.label
   * @param {Object} config.targetScheme
   */
  async _getResults({ label, targetScheme, limit, ...config }) {
    // Use local cache.
    let resultsFromCache = (this._cache[targetScheme.uri] || {})[label]
    if (resultsFromCache && resultsFromCache._limit >= limit) {
      return resultsFromCache
    }
    // Determine search URI for target scheme's registry
    const registry = _.get(targetScheme, "_registry")
    if (!registry || registry.has.search === false) {
      return []
    }
    // API request
    const data = await registry.search({
      ...config,
      search: label,
      scheme: targetScheme,
      limit,
    })
    // Save result in cache
    if (!this._cache[targetScheme.uri]) {
      this._cache[targetScheme.uri] = {}
    }
    this._cache[targetScheme.uri][label] = data
    this._cache[targetScheme.uri][label]._limit = limit
    return data
  }

}

LabelSearchSuggestionProvider.providerName = "LabelSearchSuggestion"
LabelSearchSuggestionProvider.stored = false
