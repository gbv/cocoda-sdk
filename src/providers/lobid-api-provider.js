import BaseProvider from "./base-provider.js"
import * as errors from "../errors/index.js"
import jskos from "jskos-tools"
import axios from "axios"

const api = "https://lobid.org/gnd/"

const gndJson = {
  uri: "http://bartoc.org/en/node/430",
  concepts: [
    null,
  ],
  topConcepts: [],
  type: [
    "http://www.w3.org/2004/02/skos/core#ConceptScheme",
  ],
  DISPLAY: {
    hideNotation: true,
  },
  identifier: [
    "http://www.wikidata.org/entity/Q36578",
  ],
  license: [
    {
      uri: "http://creativecommons.org/publicdomain/zero/1.0/",
    },
  ],
  namespace: "https://d-nb.info/gnd/",
  notation: [
    "GND",
  ],
  notationPattern: "[0-9X-]+",
  prefLabel: {
    de: "Gemeinsame Normdatei",
    en: "Integrated Authority File",
  },
  types: [
    {
      uri: "https://d-nb.info/standards/elementset/gnd#DifferentiatedPerson",
      prefLabel: {
        de: "Person",
        en: "Person",
      },
    },
    {
      uri: "https://d-nb.info/standards/elementset/gnd#PlaceOrGeographicName",
      prefLabel: {
        de: "Geografikum",
        en: "Place",
      },
    },
    {
      uri: "https://d-nb.info/standards/elementset/gnd#CorporateBody",
      prefLabel: {
        de: "Organisation",
        en: "Organization",
      },
    },
    {
      uri: "https://d-nb.info/standards/elementset/gnd#SubjectHeading",
      prefLabel: {
        de: "Sachbegriff",
        en: "Subject",
      },
    },
    {
      uri: "https://d-nb.info/standards/elementset/gnd#Work",
      prefLabel: {
        de: "Werk",
        en: "Work",
      },
    },
    {
      uri: "https://d-nb.info/standards/elementset/gnd#ConferenceOrEvent",
      prefLabel: {
        de: "Konferenz oder Veranstaltung",
        en: "ConferenceOrEvent",
      },
    },
  ],
}

const gndTypeScheme = new jskos.ConceptScheme({
  uri: "https://d-nb.info/standards/elementset/gnd",
  namespace: "https://d-nb.info/standards/elementset/gnd#",
})
// Add notations to GND Types above
gndJson.types.forEach(type => {
  type.notation = [gndTypeScheme.notationFromUri(type.uri)]
})

const gnd = new jskos.ConceptScheme(gndJson)

const broaderProps = [
  "broaderTerm",
  "broaderTermGeneral",
  "broaderTermGeneric",
  "broaderTermInstantial",
  "broaderTermPartitive",
]

const mappingsProps = {
  sameAs: "http://www.w3.org/2004/02/skos/core#exactMatch",
  exactMatch: "http://www.w3.org/2004/02/skos/core#exactMatch",
  closeMatch: "http://www.w3.org/2004/02/skos/core#closeMatch",
  // See also: https://d-nb.info/standards/elementset/gnd#relatedDdcWithDegreeOfDeterminacy1
  relatedDdcWithDegreeOfDeterminacy1: "http://www.w3.org/2004/02/skos/core#narrowMatch",
  relatedDdcWithDegreeOfDeterminacy2: "http://www.w3.org/2004/02/skos/core#narrowMatch",
  relatedDdcWithDegreeOfDeterminacy3: "http://www.w3.org/2004/02/skos/core#closeMatch",
  relatedDdcWithDegreeOfDeterminacy4: "http://www.w3.org/2004/02/skos/core#exactMatch",
}
const mappingSchemes = [
  // DDC
  {
    uri: "http://bartoc.org/en/node/241",
    // Note: In code, we're rewriting DDC notations to include the version number "e23/" at the end.
    uriPattern: "http://dewey.info/class/(.+)/",
  },
  // RAMEAU
  {
    uri: "http://bartoc.org/en/node/18",
    namespace: "https://data.bnf.fr/ark:/12148/",
  },
  // EMBNE
  {
    uri: "http://bartoc.org/en/node/20450",
    namespace: "https://datos.bne.es/resource/",
  },
  // Wikidata
  {
    uri: "http://bartoc.org/en/node/1940",
    namespace: "http://www.wikidata.org/entity/",
  },
  // TheSoz
  {
    uri: "http://bartoc.org/en/node/294",
    namespace: "http://lod.gesis.org/thesoz/",
  },
  // T-PRO
  {
    uri: "http://bartoc.org/en/node/20425",
    namespace: "http://uri.gbv.de/terminology/tpro/",
  },
  // VIAF
  {
    uri: "http://bartoc.org/en/node/2053",
    namespace: "http://viaf.org/viaf/",
  },
  // Note: The following vocabularies use uriPattern to work around http/https URI confusion.
  // See also: https://github.com/gbv/cocoda-sdk/issues/66#issuecomment-2273422523
  // TODO: Adjust this after the issue has been fixed in source.
  // AGROVOC
  {
    uri: "http://bartoc.org/en/node/305",
    uriPattern: "http?://aims.fao.org/aos/agrovoc/(.+)",
  },
  // MeSH
  {
    uri: "http://bartoc.org/en/node/391",
    uriPattern: "http?://id.nlm.nih.gov/mesh/(.+)",
  },
  // STW
  {
    uri: "http://bartoc.org/en/node/313",
    uriPattern: "http?://zbw.eu/stw/descriptor/(.+)",
  },
  // BNCF
  {
    uri: "http://bartoc.org/en/node/443",
    uriPattern: "https?://purl.org/bncf/tid/(.+)",
  },
  // LCSH
  {
    uri: "http://bartoc.org/en/node/454",
    uriPattern: "http?://id.loc.gov/authorities/subjects/(.+)",
  },
  // LCNAF
  {
    uri: "http://bartoc.org/en/node/18536",
    uriPattern: "http?://id.loc.gov/authorities/names/(.+)",
  },
].map(scheme => new jskos.ConceptScheme(scheme))

function toJSKOS(data) {
  const concept = {
    uri: data.id,
    notation: [data.gndIdentifier],
    prefLabel: { de: data.preferredName },
    inScheme: [{ uri: gndJson.uri }],
  }
  if (data.variantName) {
    concept.altLabel = { de: data.variantName }
  }
  if (data.usingInstructions?.length) {
    concept.scopeNote = { de: data.usingInstructions }
  }
  concept.type = data.type.map(type => gndTypeScheme.uriFromNotation(type)).filter(Boolean)
  concept.broader = []
  broaderProps.forEach(prop => {
    concept.broader = concept.broader.concat(data[prop] || [])
  })
  concept.broader = concept.broader.map(broader => ({ uri: broader.id }))
  // Include old http URI for backwards compatibilty
  if (concept.uri) {
    concept.identifier = [concept.uri.replace("https://", "http://")]
  }
  // Embedded mappings
  let mappings = []
  for (const prop of Object.keys(mappingsProps)) {
    const type = mappingsProps[prop]
    if (data[prop]?.length) {
      mappings = mappings.concat(data[prop].map(target => {
        const scheme = mappingSchemes.find(s => s.notationFromUri(target.id))
        const targetConcept = scheme?.conceptFromUri(target.id)
        if (!scheme || !targetConcept) {
          return null
        }
        // Dirty hack to add version number to DDC URIs
        if (scheme.uri === "http://bartoc.org/en/node/241") {
          targetConcept.uri += "e23/"
        }
        return {
          from: { memberSet: [{ uri: concept.uri, notation: concept.notation }]},
          fromScheme: { uri: gndJson.uri },
          to: { memberSet: [targetConcept]},
          toScheme: { uri: scheme.uri },
          type: [type],
        }
      }).filter(Boolean))
    }
  }
  if (mappings.length) {
    concept.mappings = mappings
  }
  return concept
}

// Rewrites old http URIs to https if necessary
function fixURI(uri) {
  if (uri && uri.startsWith("http://")) {
    return uri.replace("http://", "https://")
  }
  return uri
}

export default class LobidApiProvider extends BaseProvider {
  static supports = {
    schemes: true,
    data: true,
    concepts: true,
    narrower: true,
    suggest: true,
    search: true,
    types: true,
  }

  _setup() {
    // Set default API URL when not configured via BARTOC/registryForScheme
    if (!this._api.api) {
      this._api.api = api
    }
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept schceme.
   *
   * @param {Object} options
   * @param {Object} options.url API URL for server
   * @returns {Object} provider configuration
   */
  static _registryConfigForBartocApiConfig({ url, scheme } = {}) {
    // API is hardcoded
    if (!url || !scheme || !jskos.compare(scheme, gndJson) || url !== "https://lobid.org/gnd/api") {
      return null
    }
    return {
      api,
      schemes: [gndJson],
    }
  }

  async getSchemes() {
    return [gndJson]
  }

  async getTop() {
    return []
  }

  async getConcepts({ concepts }) {
    if (!concepts) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concepts" })
    }
    if (!Array.isArray(concepts)) {
      concepts = [concepts]
    }
    const notations = concepts.map(concept => {
      if (concept?.notation?.[0]) {
        return concept?.notation?.[0]
      }
      return gnd.notationFromUri(fixURI(concept?.uri))
    }).filter(Boolean)
    const errors = []
    const results = await Promise.all(notations.map(async notation => {
      try {
        const result = await axios.get(`${this._api.api}${notation}.json`)
        return toJSKOS(result.data)
      } catch (error) {
        errors.push(error)
      }
    }))
    // Only throw error if ALL given concepts failed to load
    if (errors.length === concepts.length) {
      // Just throw the first error
      throw errors[0]
    }
    return results.filter(Boolean)
  }

  async getNarrower({ concept, limit = 200, offset = 0 }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    const uri = fixURI(concept.uri)
    const q = broaderProps.map(prop => `${prop}.id:"${uri}"`).join(" OR ")
    const result = await axios.get(`${this._api.api}search`, {
      params: {
        q,
        format: "json",
        size: limit,
        from: offset,
      },
    })
    return result.data.member.map(member => toJSKOS(member))
  }

  async suggest(config) {
    const results = await this._search({ ...config, format: "json:suggest" })
    return [
      config.search,
      results.map(r => r.label),
      [],
      results.map(r => r.id),
    ]
  }

  async search(config) {
    const results = await this._search(config)
    return results.member.map(member => toJSKOS(member))
  }

  async _search({ search, types, limit = 100, offset = 0, format = "json" }) {
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    let filter = ""
    types = types?.map(type => gndTypeScheme.notationFromUri(fixURI(type))).filter(Boolean) || []
    if (types.length) {
      filter = types.map(type => `type:${type}`).join(" OR ")
    }
    const results = await axios.get(`${this._api.api}search`, { params: {
      q: search,
      filter,
      format,
      size: limit,
      from: offset,
    }})
    return results.data
  }

  async getTypes({ scheme }) {
    if (!scheme || !jskos.compare(scheme, gndJson)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search", message: scheme?.uri ? `scheme ${scheme?.uri} not supported` : "" })
    }
    return gndJson.types
  }

}

LobidApiProvider.providerName = "LobidApi"
LobidApiProvider.providerType = "http://bartoc.org/api-type/lobid-gnd"
