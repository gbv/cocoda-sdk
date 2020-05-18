const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("../utils/lodash")
const errors = require("../errors")

// TODO: Only keep the last 20 results in cache.
// TODO: Try to remove dependencies on `selected`, `scheme._registry.registry.uri`, etc.

/**
 * OpenSearch Search Suggestions.
 *
 * This class provides access to the [OpenSearch Search Suggestions API](https://github.com/dewitt/opensearch/blob/master/mediawiki/Specifications/OpenSearch/Extensions/Suggestions/1.1/Draft%201.wiki)
 *
 * The provider requires that a list of registries with search endpoints is provided via `setRegistries`.
 *
 * To use it in a registry, specify as "SearchSuggestion":
 * ```json
 * {
 *  "provider": "SearchSuggestion"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
class SearchSuggestionProvider extends BaseProvider {

  /**
   * @private
   */
  _setup() {
    this._cache = []
    this.has.mappings = true
  }

  /**
   * Sets a local list of registries where the search providers are taken from.
   *
   * @param {Object[]} registries list of registries
   */
  setRegistries(registries) {
    this._registries = registries
  }

  /**
   * List of search provider URIs.
   *
   * @private
   */
  get _searchUris() {
    const _searchUris = {}
    for (let registry of this._registries) {
      const search = _.get(registry, "api.search") || _.get(registry, "_jskos.search") || registry.search
      if (search && _.isString(search)) {
        _searchUris[registry.uri] = search
      }
    }
    return _searchUris
  }

  /**
   * Override `supportsScheme` to check whether a search URI is available for the scheme's registry.
   *
   * @param {Object} scheme - target scheme to check for support
   * @returns {boolean}
   */
  supportsScheme(scheme) {
    let targetRegistry = _.get(scheme, "_registry.uri")
    return super.supportsScheme(scheme) && targetRegistry != null && this._searchUris && this._searchUris[targetRegistry]
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
  async getMappings({ from, to, mode, selected, ...config }) {
    // TODO: Why mode?
    if (mode != "or") {
      return []
    }
    if (!this._searchUris) {
      throw new errors.MissingApiUrlError({ message: "No registries available to search" })
    }
    if (!selected) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "selected" })
    }
    let promises = []
    if (from && this.supportsScheme(selected.scheme[false])) {
      promises.push(this._getMappings({ ...config, concept: from, sourceScheme: selected.scheme[true], targetScheme: selected.scheme[false] }))
    }
    if (to && this.supportsScheme(selected.scheme[true])) {
      promises.push(this._getMappings({ ...config, concept: to, sourceScheme: selected.scheme[false], targetScheme: selected.scheme[true], swap: true }))
    }
    return _.union(...(await Promise.all(promises)))
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
  async _getMappings({ concept, sourceScheme, targetScheme, swap = false, ...config }) {
    if (!concept || !sourceScheme || !targetScheme) {
      return []
    }
    // If source scheme is the same as target scheme, skip
    if (jskos.compare(sourceScheme, targetScheme)) {
      return []
    }
    // Prepare label
    let label = jskos.prefLabel(concept)
    if (!label) {
      return []
    }
    // Get results from API or cache
    const results = await this._getResults({ ...config, label, targetScheme })
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
  async _getResults({ label, targetScheme, ...config }) {
    // Use local cache.
    let resultsFromCache = (this._cache[targetScheme.uri] || {})[label]
    if (resultsFromCache) {
      return resultsFromCache
    }
    // Determine search URI for target scheme's registry
    const targetRegistry = _.get(targetScheme, "_registry.uri")
    const url = targetRegistry != null && this._searchUris && this._searchUris[targetRegistry]
    if (!url) {
      return []
    }
    // API request
    const data = await this.axios({
      ...config,
      method: "get",
      url,
      params: {
        query: label,
        limit: 10,
        voc: targetScheme.uri,
      },
    })
    // Save result in cache
    if (!this._cache[targetScheme.uri]) {
      this._cache[targetScheme.uri] = {}
    }
    this._cache[targetScheme.uri][label] = data
    return data
  }

}

SearchSuggestionProvider.providerName = "SearchSuggestion"
SearchSuggestionProvider.stored = false

module.exports = SearchSuggestionProvider
