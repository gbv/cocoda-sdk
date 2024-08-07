import BaseProvider from "./base-provider.js"
import * as errors from "../errors/index.js"
import jskos from "jskos-tools"
import axios from "axios"

const locUriPrefix = "http://id.loc.gov/authorities/"
const supportedSchemes = [
  {
    uri: `${locUriPrefix}subjects`,
    identifier: [
      "http://bartoc.org/en/node/454",
    ],
    notation: ["LCSH"],
    concepts: [null],
    topConcepts: [],
  },
  {
    uri: `${locUriPrefix}names`,
    identifier: [
      "http://bartoc.org/en/node/18536",
    ],
    notation: ["LCNAF"],
    concepts: [null],
    topConcepts: [],
  },
]
const lccUri = `${locUriPrefix}classification`

function madsToJskosItem(data) {
  const item = {}
  item.uri = data["@id"]
  // Notation
  item.notation = (data["http://www.loc.gov/mads/rdf/v1#code"] || []).map(n => n["@value"])
  // prefLabel
  const prefLabelArray = data["http://www.loc.gov/mads/rdf/v1#authoritativeLabel"] || data["http://www.w3.org/2000/01/rdf-schema#label"] || []
  if (prefLabelArray.length) {
    item.prefLabel = {}
    item.prefLabel[prefLabelArray[0]["@language"] || "en"] = prefLabelArray[0]["@value"]
  }
  // altLabel
  const altLabelArray = data["http://www.w3.org/2004/02/skos/core#altLabel"] || []
  if (altLabelArray.length) {
    item.altLabel = { en: altLabelArray.map(l => l["@value"]) }
  }
  // definition
  for (let definition of data["http://www.w3.org/2000/01/rdf-schema#comment"] || []) {
    item.definition = item.definition || {}
    item.definition.en = item.definition.en || []
    item.definition.en.push(definition["@value"])
  }
  return item
}

function madsToJskosScheme(data) {
  const scheme = madsToJskosItem(data)
  scheme.namespace = scheme.uri + "/"
  scheme.type = ["http://www.w3.org/2004/02/skos/core#ConceptScheme"]
  // TODO: topConcepts can possibly be reenabled for LCC
  // const topConcepts = data["http://www.loc.gov/mads/rdf/v1#hasMADSSchemeMember"]
  // if (scheme.uri === lccUri && topConcepts) {
  //   scheme.topConcepts = topConcepts.map(c => {
  //     const concept = madsToJskosItem(c)
  //     concept.inScheme = [{ uri: scheme.uri }]
  //     return concept
  //   })
  // }
  return scheme
}


// TODO: This might not be necessary anymore once LoC fixes their API.
const schemeNamespaceFilter = (scheme) => (c) => {
  if (!c || !scheme || !scheme.namespace) {
    // Do not filter if no scheme is given
    return true
  }
  return c.uri.startsWith(scheme.namespace)
}

function madsToJskosConcept(data, { scheme }) {
  const concept = madsToJskosItem(data)
  concept.type = ["http://www.w3.org/2004/02/skos/core#Concept"]
  concept.inScheme = scheme ? [scheme] : (data["http://www.loc.gov/mads/rdf/v1#isMemberOfMADSScheme"] || []).map(s => supportedSchemes.find(s2 => s2.uri === s["@id"]))
  if (!concept.inScheme.length || !concept.inScheme[0]) {
    // TODO: Should conversion fail if inScheme couldn't be set?
    delete concept.inScheme
  }
  // narrower
  const narrower = data["http://www.loc.gov/mads/rdf/v1#hasNarrowerAuthority"] || (jskos.compare(concept.inScheme[0], { uri: lccUri }) && data["http://www.loc.gov/mads/rdf/v1#hasMADSCollectionMember"]) || []
  concept.narrower = narrower.map(n => ({ uri: n["@id"] })).filter(schemeNamespaceFilter(concept.inScheme && concept.inScheme[0]))
  // broader
  const broader = data["http://www.loc.gov/mads/rdf/v1#hasBroaderAuthority"] || (jskos.compare(concept.inScheme[0], { uri: lccUri }) && data["http://www.loc.gov/mads/rdf/v1#isMemberOfMADSCollection"]) || []
  concept.broader = broader.map(n => ({ uri: n["@id"] })).filter(schemeNamespaceFilter(concept.inScheme && concept.inScheme[0]))
  return concept
}

/**
 * Library of Congress API (experimental)
 *
 * This class provides access to concept schemes and their concepts via the Library of Congress Linked Open Data Service (https://id.loc.gov/), in [JSKOS format](https://gbv.github.io/jskos/).
 *
 * To use it in a registry, specify `provider` as "LocApi":
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/loc-concepts",
 *  "provider": "LocApi",
 * }
 * ```
 *
 * No further configuration is needed. Currently supported are LC Subject Headings (LCSH) and LC Name Authority File (LCNAF), both of which are hardcoded.
 *
 * Additionally, the following JSKOS properties on the registry can be provided: `prefLabel`, `notation`, `definition` (i.e. to be shown in Cocoda)
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class LocApiProvider extends BaseProvider {
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
   * @param {Object} options.scheme scheme for which the config is requested
   * @returns {Object} provider configuration
   */
  static _registryConfigForBartocApiConfig({ scheme } = {}) {
    // Check if scheme is supported
    if (!scheme || !supportedSchemes.find(s => jskos.compare(s, scheme))) {
      return null
    }
    // We don't need any API endpoints because they are hardcoded.
    return {
      schemes: [scheme],
    }
  }

  /**
   * Returns all concept schemes.
   *
   * @returns {Object[]} array of JSKOS concept scheme objects
   */
  async getSchemes() {
    const schemes = []

    for (let scheme of await Promise.all(
      supportedSchemes.filter(s => !this.schemes || !this.schemes.length || this.schemes.find(s2 => jskos.compare(s, s2))).map(s => axios({
        method: "get",
        url: `${s.uri.replace("http:", "https:")}.json`,
      }).then(({ status, data }) => {
        if (status === 200) {
          let scheme = data.find(d => s.uri === d["@id"])
          if (scheme) {
            scheme = jskos.merge(madsToJskosScheme(scheme), s)
            scheme.topConcepts = (scheme.topConcepts || []).filter(c => c)
            return scheme
          }
        }
        return null
      })))) {
      if (scheme) {
        schemes.push(scheme)
      }
    }

    return schemes
  }

  /**
   * TODO: Possibly reenable for LCC
   * Returns top concepts for a concept scheme.
   *
   * @param {Object} config
   * @param {Object} config.scheme concept scheme object
   * @returns {Object[]} array of JSKOS concept objects
   */
  // async getTop({ scheme }) {
  //   if (scheme.topConcepts && !scheme.topConcepts.includes(null)) {
  //     return scheme.topConcepts
  //   }
  //   const schemes = await this.getSchemes()
  //   scheme = schemes.find(s => jskos.compare(s, scheme))
  //   return scheme && scheme.topConcepts || []
  // }

  /**
   * Returns details for a list of concepts.
   *
   * @param {Object} config
   * @param {Object[]} config.concepts list of concept objects to load
   * @returns {Object[]} array of JSKOS concept objects
   */
  async getConcepts({ concepts }) {
    if (!Array.isArray(concepts)) {
      concepts = [concepts]
    }

    const resultConcepts = []

    for (let concept of await Promise.all(concepts.map(c => axios({
      method: "get",
      url: `${c.uri.replace("http:", "https:")}.json`,
    }).then(({ status, data }) => {
      if (status === 200) {
        let concept = data.find(d => c.uri === d["@id"])
        if (concept) {
          return madsToJskosConcept(concept, { scheme: c.inScheme && c.inScheme[0] })
        }
        return null
      }

    })))) {
      if (concept) {
        resultConcepts.push(concept)
      }
    }

    return resultConcepts
  }

  /**
   * Returns suggestion result in OpenSearch Suggest Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} config.scheme concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {number} [config.offset=0] offset
   * @returns {Array} result in OpenSearch Suggest Format
   */
  async suggest(config) {
    const results = await this.search(config)
    return [
      config.search,
      results.map(c => {
        return jskos.prefLabel(c, { fallbackToUri: true })
      }),
      [],
      results.map(c => c.uri),
    ]
  }

  /**
   * Returns search results in JSKOS Format.
   *
   * @param {Object} config
   * @param {string} config.search search string
   * @param {Object} config.scheme concept scheme to search in
   * @param {number} [config.limit=100] maximum number of search results (default might be overridden by registry)
   * @param {number} [config.offset=0] offset
   * @returns {Array} result in JSKOS Format
   */
  async search({ search, scheme, limit, offset }) {
    const schemeUri = jskos.getAllUris(scheme).find(uri => uri.startsWith(locUriPrefix))
    if (!schemeUri || !supportedSchemes.find(s => jskos.compare(s, { uri: schemeUri }))) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "provided scheme is not supported (yet)" })
    }
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search", message: "parameter is empty or missing" })
    }
    limit = limit || this._jskos.suggestResultLimit || 100
    offset = offset || 0
    const { data } = await axios({
      method: "get",
      url: `${schemeUri}/suggest2`.replace("http:", "https:"),
      params: {
        q: search,
        count: limit || 100,
        offset,
        searchtype: "keyword",
      },
    })
    return (data.hits || []).map(d => ({
      uri: d.uri,
      notation: [d.token],
      prefLabel: { en: d.aLabel },
      inScheme: [scheme],
    })).filter(schemeNamespaceFilter(scheme))
  }

}

LocApiProvider.providerName = "LocApi"
LocApiProvider.providerType = "http://bartoc.org/api-type/loc"
