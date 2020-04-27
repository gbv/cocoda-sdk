const BaseProvider = require("./base-provider")
const jskos = require("jskos-tools")
const _ = require("lodash")

// TODO: Only keep the last 20 results in cache.
// TODO: Try to remove dependencies on `selected`, `scheme._provider.registry.uri`, etc.

/**
 * Provider for search suggestions.
 *
 * The constructor requires the `registries` property in `options` (second param) which should be all available ConceptApi registries.
 */
class SearchSuggestionProvider extends BaseProvider {

  _setup() {
    this._cache = []
    this.has.mappings = true
  }

  setRegistries(registries) {
    this._registries = registries
  }

  get _searchUris() {
    const _searchUris = {}
    for (let registry of this._registries) {
      const search = registry.search || _.get(registry, "provider.registry.search")
      if (search) {
        _searchUris[registry.uri] = search
      }
    }
    return _searchUris
  }

  /**
   * Override `supportsScheme` to check whether a search URI is available for the scheme's registry.
   *
   * @param {object} scheme - target scheme to check for support
   */
  supportsScheme(scheme) {
    let targetRegistry = _.get(scheme, "_provider.registry.uri")
    return super.supportsScheme(scheme) && targetRegistry != null && this._searchUris && this._searchUris[targetRegistry]
  }

  async getMappings({ from, to, mode, selected, ...config }) {
    // TODO: Why mode?
    if (!this._searchUris || mode != "or" || !selected) {
      return []
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
   * @param {object} concept
   * @param {object} sourceScheme
   * @param {object} targetScheme
   * @param {boolean} swap - whether to reverse the direction of the mappings
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
   * @param {string} label
   */
  async _getResults({ label, targetScheme, ...config }) {
    // Use local cache.
    let resultsFromCache = (this._cache[targetScheme.uri] || {})[label]
    if (resultsFromCache) {
      return resultsFromCache
    }
    // Determine search URI for target scheme's registry
    const targetRegistry = _.get(targetScheme, "_provider.registry.uri")
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
