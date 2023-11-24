import BaseProvider from "./base-provider.js"
import * as errors from "../errors/index.js"
import axios from "axios"
import jskos from "jskos-tools"

/**
 * TODOs:
 * - [ ] Clean up conversion to JSKOS
 * - [ ] Notations? (might be possible if NoT provided URI namespace)
 * - [ ] Source languages (see https://github.com/netwerk-digitaal-erfgoed/network-of-terms/issues/1105)
 * - [ ] Clean up GraphQL query strings
 * - [ ] Better error handling
 * - [ ] Implement getTop (if possible)
 * - [ ] Implement getNarrower and getAncestors (already returned by getConcepts, but methods should be implemented nonetheless)
 * - [ ] More testing required
 */

/**
 * Add this entry to registries:
{
  "provider": "NoTApi",
  "uri": "http://coli-conc.gbv.de/registry/not-api",
  "api": "https://termennetwerk-api.netwerkdigitaalerfgoed.nl/graphql",
  "notation": [
    "NoT"
  ]
}
 */

const cache = {
  schemes: [],
}

export default class NoTApiProvider extends BaseProvider {
  // TODO: Can unsupported types be supported later? If not, just remove them here.
  static supports = {
    schemes: true,
    top: false,
    data: true,
    concepts: true,
    narrower: false,
    ancestors: false,
    suggest: true,
    search: true,
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept schceme.
   *
   * @param {Object} options
   * @param {Object} options.url API URL for server
   * @returns {Object} provider configuration
   */
  static _registryConfigForBartocApiConfig({ url } = {}) {
    if (!url) {
      return null
    }
    return {
      api: url,
    }
  }

  async getSchemes() {
    if (!cache.schemes.length) {
      const result = await axios.post(this._api.api, {
        query: "query sources { sources { name uri description alternateName } }",
        operationName: "sources",
      })
      const schemes = result?.data?.data?.sources || []
      if (schemes.length) {
        cache.schemes = schemes.map(scheme => {
          const jskos = {
            uri: scheme.uri,
            prefLabel: { und: scheme.name },
          }
          if (scheme.desciption) {
            jskos.description = { und: [scheme.description] }
          }
          if (scheme.alternateName) {
            jskos.notation = [scheme.alternateName]
          }
          return jskos
        })
      } else {
        return []
      }
    }
    return cache.schemes
  }

  // async getTop() {
  // }

  async getConcepts({ concepts }) {
    if (!concepts) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concepts" })
    }
    if (!Array.isArray(concepts)) {
      concepts = [concepts]
    }
    const result = await axios.post(this._api.api, {
      query: `query { lookup( uris: [${concepts.map(c => `"${c.uri}"`)}], ) { uri source {   ... on Source {     uri   } } result {   ... on Term {     uri     prefLabel     scopeNote     altLabel  broader { uri } narrower { uri } } } } }`,
    })
    return (result.data?.data?.lookup || []).map(entry => {
      const concept = {
        uri: entry.uri,
        inScheme: [cache.schemes.find(scheme => jskos.compare(scheme, { uri: entry.source.uri }))],
      }
      if (entry.result?.prefLabel?.[0]) {
        concept.prefLabel = { und: entry.result.prefLabel[0] }
      }
      if (entry.result?.altLabel?.[0]) {
        concept.altLabel = { und: entry.result.altLabel }
      }
      if (entry.result?.scopeNote?.[0]) {
        concept.scopeNote = { und: entry.result.scopeNote }
      }
      if (entry.result?.broader?.length) {
        concept.broader = entry.result.broader
      }
      if (entry.result?.narrower?.length) {
        concept.narrower = entry.result.narrower
      }
      return concept
    })
  }

  // async getNarrower({ concept }) {
  // }

  // async getAncestors({ concept }) {
  // }

  async suggest(config) {
    const search = config.search
    const results = await this.search(config)
    return [
      search,
      results.map(r => jskos.prefLabel(r, { fallbackToUri: false })),
      [],
      results.map(r => r.uri),
    ]
  }

  async search({ scheme, search }) {
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    if (!scheme || !jskos.isContainedIn(scheme, cache.schemes)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    const result = await axios.post(this._api.api, {
      query: `query {  terms(    sources: ["${scheme.uri}"]    query: "${search}"  ) {    source {      uri    }     result {      ... on Terms {        terms {          uri          prefLabel          scopeNote        }      }    }  }}`,
    })
    return (result.data?.data?.terms?.[0]?.result?.terms || []).map(concept => {
      const jskos = {
        uri: concept.uri,
        inScheme: [scheme],
      }
      if (concept.prefLabel?.[0]) {
        jskos.prefLabel = { und: concept.prefLabel[0] }
      }
      if (concept.altLabel?.[0]) {
        jskos.altLabel = { und: concept.altLabel }
      }
      if (concept.scopeNote?.[0]) {
        jskos.scopeNote = { und: concept.scopeNote[0] }
      }
      return jskos
    })
  }

}

NoTApiProvider.providerName = "NoTApi"
NoTApiProvider.providerType = "http://bartoc.org/api-type/noterms"
