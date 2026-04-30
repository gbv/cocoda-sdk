import BaseProvider from "./base-provider.js"

/**
 * OLS API V2.
 *
 * The Ontology Lookup Service (OLS) hosts ontologies. Implementation is not fully completed yet.
 *
 * Individual are not supported.
 * Properties are only supported partially.
 *
 * ```js
 * const provider = new OlsApiProvider({
 *   endpoint: "https://api.terminology.tib.eu/api/v2/",     // OLS API V2 base URL 
 *   language: "en",         // default language to use for labels and descriptions
 * })
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class OlsApiProvider extends BaseProvider {

  static providerName = "OlsApi"
  static providerType = "http://bartoc.org/api-type/ols"
  static supports = {
    schemes: true,
    top: true,
    data: false, // TODO
    concepts: true,
    narrower: true,
    ancestors: true,
    types: true,
    suggest: true,
    search: true,
  }

  constructor(config) {
    super(config)
    this.endpoint = config.endpoint || config.uri
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept schceme.
   * TODO: make this obsolete
   */
  static _registryConfigForBartocApiConfig({ url } = {}) {
    if (url) {
      return { endpoint: url }
    }
  }

  /**
   * Constructs the full API URL for a given endpoint.
   */
  _getApiUrl(parts, params = {}) {
    const url = this.endpoint + parts.join("/")
    params = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null))
    params = new URLSearchParams(params)
    return params.size ? `${url}?${params}` : url
  }

  _ontologyToJSKOS(ontology) {
    // TODO: filter out skos concept schemes
    const lan = ontology.lang || this._language || "en"
    const scheme = {}
    if (ontology.iri) {
      scheme.uri = ontology.iri
    }
    scheme.type = [
      "http://www.w3.org/2004/02/skos/core#ConceptScheme",
    ]
    if (ontology["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]) {
      // TODO: should always be owl:Ontology?
      scheme.type = scheme.type.concat(ontology["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"])
    }
    if (ontology.title) {
      scheme.prefLabel = {}
      scheme.prefLabel[lan] = ontology.title
    }
    if (ontology.description) {
      scheme.definition = {}
      scheme.definition[lan] = [ontology.description]
    }
    if (ontology.homepage) {
      scheme.url = ontology.homepage
    }
    if (ontology.tracker) {
      scheme.issueTracker = [{ url: ontology.tracker }]
    }
    if (ontology.language) {
      scheme.languages = ontology.language
    }
    if (ontology.ontologyId) {
      scheme.VOCID = ontology.ontologyId
      scheme.notation = [ontology.ontologyId]
    }
    if (ontology.license?.url) {
      scheme.license = [{ uri: ontology.license.url }]
    }
    return scheme
  }

  _termToJSKOS(term) {
    const lan = term.language || this._language || "en"
    const concept = {}
    if (term.curie) {
      concept.notation = [term.curie]
    }
    if (term.hasDirectChildren) {
      concept.narrower = [null]
    } else {
      concept.narrower = []
    }
    if (term.hasDirectParents) {
      concept.broader = [null]
    } else {
      concept.broader = []
    }
    if (term.iri) {
      concept.uri = term.iri
    }
    if (term["http://www.w3.org/2000/01/rdf-schema#label"]) {
      concept.prefLabel = {}
      concept.prefLabel[lan] = term["http://www.w3.org/2000/01/rdf-schema#label"]
    }
    concept.type = [
      "http://www.w3.org/2004/02/skos/core#Concept",
      // FIXME: properties are no classes
      "http://www.w3.org/2002/07/owl#Class",
    ]
    if (term.ontologyIri) {
      concept.inScheme = [{ uri: term.ontologyIri }]
    }
    return concept
  }

  // #### API REQUESTS ####

  // TODO: rename _skipAdditionalParameters
  async _request(url, config = { _skipAdditionalParameters: true }) {
    if (url) {
      url = new URL(url)
      const given = Object.fromEntries(url.searchParams.entries())
      return this.axios({
        method: "get",
        url: url.origin + url.pathname,
        params: {
          ...given,
          ...config.params, // explicit params win
        },
        ...config,
      })
    }
  }

  // API REQUESTS SCHEMES

  async _paginate(base, query, limit) {
    const size = limit > 0 ? limit : null
    let url = this._getApiUrl(base, { ...query, size })
    let page = await this._request(url)
    let items = page?.elements || []
    if (!size) {
      const totalPages = page?.totalPages || 0
      for (let n = 1; n < totalPages; n++) {
        url = this._getApiUrl(base, { ...query, page: n })
        page = await this._request(url)
        items = items.concat(page?.elements || [])
      }
    }
    return items
  }

  // API REQUESTS CONCEPTS

  async _getConceptOls(concept) {
    const VOCID = await this._getSchemeVOCID(concept?.inScheme?.[0])
    if (VOCID) {
      let url = null
      if (concept.notation) {
        url = this._getApiUrl(["ontologies", VOCID, "classes"], { curie: concept.notation })
      } else if (concept.uri) {
        url = this._getApiUrl(["ontologies", VOCID, "classes"], { iri: concept.uri })
      }
      let response = await this._request(url)
      return response?.elements?.[0] || null
    }
  }

  async _searchOls(search, scheme, limit, types) {
    let items = []
    const knownTypes = {
      "http://www.w3.org/2002/07/owl#Class": "classes",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property": "properties",
    }
    if (!types?.length) {
      types = Object.keys(knownTypes)
    }
    for (const type of types) {
      if (type in knownTypes) {
        const VOCID = scheme ? await this._getSchemeVOCID(scheme) : null // if no scheme is given, search in all schemes
        const query = { search: search, ontology: VOCID }
        if (!scheme || VOCID) {
          // TODO: how to merge with limit of multiple are included
          const found = await this._paginate([knownTypes[type]], query, limit)
          items.push(...found)
        }
      }
    }
    return items
  }

  // UTILITIES

  async _conceptIriFromObj(VOCID, conceptNotation) {
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO:0000001
    let url = this._getApiUrl(["ontologies", VOCID, "classes"], { curie: conceptNotation })
    let response = await this._request(url)
    if (response && response.elements && response.elements.length > 0) {
      return response.elements[0].iri
    }
  }

  get _language() {
    // TODO: cleanup
    return this._jskos.language || this.languages[0] || this._defaultLanguages[0] || "en"
  }

  async _getSchemeVOCID(scheme) {
    return scheme?.VOCID
      ? scheme.VOCID
      : this._getScheme(scheme).then(s => s?.ontologyId)
  }

  async _getScheme(scheme) {
    if (scheme) {
      const { VOCID, uri, notation, identifier } = scheme
      if (VOCID) {
        return this._request(this._getApiUrl(["ontologies", VOCID]))
      }
      if (uri) {
        scheme = await this._getSchemeFromUri(uri)
        if (scheme) {
          return scheme
        }
      }
      // VOCID is likely the notation
      if (notation?.[0] && (uri || identifier?.length)) {
        scheme = await this._request(this._getApiUrl(["ontologies", notation[0]]))
        if (scheme.iri === uri || identifier?.includes(scheme.iri)) {
          return scheme
        }
      }
      // Try other URIs 
      for (let id of (identifier || [])) {
        const found = await this._getSchemeFromUri(id)
        if (found) {
          return found
        }
      }
    }
  }

  async _getSchemeFromUri(uri) {
    if (uri) {
      const url = this._getApiUrl(["ontologies"], { searchFields: "iri", search: uri })
      const response = await this._request(url)
      const schemes = response?.elements || []
      return schemes.reduce((short, cur) => cur.ontologyId.length < short.ontologyId.length ? cur : short, schemes[0])
    }
    return null
  }

  // MAIN FUNCTIONS

  // TODO: query parameter are different: schemes are in "params.uri"?
  async getSchemes({ schemes, limit }) {
    let ontologies = []

    if (schemes) {
      ontologies = (await Promise.all(schemes.map(s => this._getScheme(s)))).filter(Boolean)
    } else if (limit > 0) {
      const url = this._getApiUrl(["ontologies"], { size: limit })
      const response = await this._request(url)
      ontologies = response.elements || []
    } else {
      ontologies = await this._paginate(["ontologies"], {})
    }

    return Promise.all(ontologies.map(scheme => this._ontologyToJSKOS(scheme)))
  }

  async getConcepts({ concepts, scheme, limit }) {
    let result = []
    if (concepts) {
      for (const concept of concepts) {
        let item = await this._getConceptOls(concept)
        if (item) {
          result.push(await this._termToJSKOS(item))
        }
      }
    } else if (scheme) {
      const VOCID = await this._getSchemeVOCID(scheme)
      if (VOCID) {
        const items = await this._paginate(["ontologies", VOCID, "classes"], {}, limit)
        result = Promise.all(items.map(item => this._termToJSKOS(item)))
      }
    }
    return result
  }

  async getTop({ scheme }) {
    const VOCID = await this._getSchemeVOCID(scheme)
    if (VOCID) {
      let response = await this._paginate(["ontologies", VOCID, "classes"], { hasDirectParents: "false" }, null)
      return Promise.all(response.map(item => this._termToJSKOS(item)))
    }
    return []
  }

  async _splitConcept(concept) {
    const obj = {}
    if (concept) {
      obj.VOCID = await this._getSchemeVOCID(concept?.inScheme?.[0]) // TODO: what if multiple schemes?
      obj.iri = concept.uri || await this._conceptIriFromObj(obj.VOCID, concept.notation)
      obj.iri = encodeURIComponent(encodeURIComponent(obj.iri))
    }
    return obj
  }

  async getNarrower({ concept }) {
    const { VOCID, iri } = await this._splitConcept(concept)
    if (VOCID && iri) {
      const items = await this._paginate(["ontologies", VOCID, "classes", iri, "children"], {}, 0)
      return Promise.all(items.map(item => this._termToJSKOS(item)))
    }
    return []
  }

  async getAncestors({ concept }) {
    const { VOCID, iri } = await this._splitConcept(concept)
    if (VOCID && iri) {
      let response = await this._paginate(["ontologies", VOCID, "classes", iri, "ancestors"], {}, null)
      return Promise.all(response.map(item => this._termToJSKOS(item)))
    }
    return []
  }

  async getTypes() {
    return [{
      uri: "http://www.w3.org/2002/07/owl#Class",
      prefLabel: {
        en: "Class",
        de: "Klasse",
      },
    },{
      uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
      prefLabel: {
        en: "Property",
        de: "Eigenschaft",
      },
    }]
  }

  async search({ search, scheme = null, limit = 0, types = ["http://www.w3.org/2002/07/owl#Class"] }) {
    let items = await this._searchOls(search, scheme, limit, types)
    return Promise.all(items.map(item => this._termToJSKOS(item)))
  }
}
