import BaseProvider from "./base-provider.js"

/**
 * OLS API V2.
 *
 * The Ontology Lookup Service (OLS) hosts ontologies. Implementation is not fully completed yet.
 *
 * ```js
 * const provider = new OlsApiProvider({
 *   uri: "https://api.terminology.tib.eu/api/v2/",     // OLS API V2 base URL 
 *   language: "en",                                    // default language to use for labels and descriptions
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
    data: false,        // TODO
    concepts: true,
    narrower: true,
    ancestors: true,
    types: false,       // TODO
    suggest: true,
    search: true,
  }


  /**
   * Constructs the full API URL for a given endpoint.
   */
  _getApiUrl(parts, params = {}) {
    const url = this.uri + parts.join("/")
    params = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null),
    )
    params = new URLSearchParams(params)
    return params.size ? `${url}?${params}` : url
  }


  _ontologyToJSKOS(ontology) {
    const lan = ontology.lang || this._language || "en"
    const scheme = {}
    if (ontology.iri) {
      scheme.uri = ontology.iri
    }
    scheme.type = [
      "http://www.w3.org/2004/02/skos/core#ConceptScheme",
    ]
    if (ontology["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]) {
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
    if (!url) {
      return
    }
    try {
      url = new URL(url)
      const inlineParams = Object.fromEntries(url.searchParams.entries())

      const result = await this.axios({
        method: "get",
        url: url.origin + url.pathname,
        params: {
          ...inlineParams,
          ...config.params, // explicit params win
        },
        ...config,
      })
      return result
    } catch (error) {
      // TODO: remove or make configurable
      if (error?.code === "ECONNRESET") {
        config._retryCount = (config._retryCount ?? 0) + 1
        if (config._retryCount < 3) {
          console.warn(`ECONNRESET — retry ${config._retryCount}/3`)
          return this._request(url, config)
        }
      }
      console.error("Error requesting URL: ", url, error)
    }
    return null
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
    // https://api.terminology.tib.eu/api/ontologies/envo/terms?id=BFO_0000001
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO:0000001
    // https://api.terminology.tib.eu/api/ontologies/envo/terms?iri=http://purl.obolibrary.org/obo/BFO_0000001
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http://purl.obolibrary.org/obo/BFO_0000001
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



  async _searchOls(search, scheme, limit, types = ["http://www.w3.org/2002/07/owl#Class"]) {
    let items = []
    const knownTypes = {
      "http://www.w3.org/2002/07/owl#Class": "classes",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property": "properties",
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

  async _getSchemeVOCIDFromUri(uri) {
    let url = this._getApiUrl(["ontologies"], { searchFields: "iri", search: uri })
    let response = await this._request(url)
    let VOCIDs = response?.elements.map(e => e.ontologyId) || []
    if (VOCIDs.length == 0) {
      return null
    }
    // if multiple, return the shortest one (e.g., envo, not envo2021)
    return VOCIDs.reduce((shortest, current) => current.length < shortest.length ? current : shortest)
  }

  async _getSchemeVOCID(scheme) {
    if (typeof scheme === "object" && scheme !== null) {
      if (scheme.uri) {
        return await this._getSchemeVOCIDFromUri(scheme.uri)
      }
      if (scheme.VOCID) {
        return scheme.VOCID
      }
    }
    if (typeof scheme === "string") {
      return await this._getSchemeVOCIDFromUri(scheme)
    }
    return null
  }

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

  async _getSchemeOls({ uri, VOCID }) {
    if (VOCID) {
      return await this._request(this._getApiUrl(["ontologies", VOCID]))
    }
    if (uri) {
      const url = this._getApiUrl(["ontologies"], { searchFields: "iri", search: uri })
      let response = await this._request(url)
      let schemes = response.elements
      if (schemes.length > 0) {
        return schemes.reduce((shortest, current) => current.ontologyId.length < shortest.ontologyId.length ? current : shortest, schemes[0])
      }
    }
    return null
  }

  // MAIN FUNCTIONS

  // TODO: query parameter are different: schemes are in "params.uri"?
  async getSchemes({ schemes, limit, ..._config }) {
    let ontologies = []

    if (schemes) {
      ontologies = (await Promise.all(schemes.map(s => this._getSchemeOls(s)))).filter(Boolean)
    } else if (limit > 0) {
      const url = this._getApiUrl(["ontologies"], { size: limit })
      const response = await this._request(url)
      ontologies = response.elements || []
    } else {
      ontologies = await this._paginate(["ontologies"], {})
    }

    return Promise.all(ontologies.map(scheme => this._ontologyToJSKOS(scheme)))
  }

  async getConcepts({ concepts, scheme, limit, ..._config }) {
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
      const items = VOCID ? await this._paginate(["ontologies", VOCID, "classes"], {}, limit) : []
      result = Promise.all(items.map(item => this._termToJSKOS(item)))
    }
    return result
  }

  async getTop({ scheme, ..._config }) {
    const VOCID = await this._getSchemeVOCID(scheme)
    if (VOCID) {
      let url = this._getApiUrl(["ontologies", VOCID, "classes"], { hasDirectParents: "false" })
      let response = await this._request(url)
      if (response?.elements) {
        return Promise.all(response.elements.map(item => this._termToJSKOS(item)))
      }
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

  async getNarrower({ concept, ..._config }) {
    const { VOCID, iri } = await this._splitConcept(concept)
    if (VOCID && iri) {
      let url = this._getApiUrl(["ontologies", VOCID, "classes", iri, "children"])
      let response = await this._request(url)
      if (response?.elements) {
        return Promise.all(response.elements.map(item => this._termToJSKOS(item)))
      }
    }
    return []
  }

  async getAncestors({ concept, ..._config }) {
    const { VOCID, iri } = await this._splitConcept(concept)
    if (VOCID && iri) {
      let url = this._getApiUrl(["ontologies", VOCID, "classes", iri, "ancestors"])
      let response = await this._request(url)
      if (response?.elements) {
        return Promise.all(response.elements.map(item => this._termToJSKOS(item)))
      }
    }
    return []
  }

  async search({ search, scheme = null, limit = 0, types = ["http://www.w3.org/2002/07/owl#Class"], ..._config }) {
    let items = await this._searchOls(search, scheme, limit, types)
    return Promise.all(items.map(item => this._termToJSKOS(item)))
  }
}
