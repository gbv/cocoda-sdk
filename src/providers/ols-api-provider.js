import BaseProvider from "./base-provider.js"
/*
import jskos from "jskos-tools"
import jsonld from "jsonld"
import context_mod from "./contexts/context_mod.js"
import context_jskos from "./contexts/context_jskos.js"
*/
/**
 * OLS API.
 *
 * The Ontology Lookup Service (OLS) is a repository for biomedical ontologies that aims to provide a single point of access to the latest ontology versions.
 *
 * initialization example:
 * ```json
 * {
 *   provider: "OlsApi",
 *   language: "en",           // language to use for labels and descriptions. if no language is given in ols, it defaults to "en"
 *   cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
 *   uri: "https://api.terminology.tib.eu/api" // "http://service.tib.eu/ts4tib/api"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class OlsApiProvider extends BaseProvider {

  // #### PROPERTIES ####

  // - providerName (This is how a provider is identified in a "registry" object in field `provider`.)
  static providerName = "OlsApi"
  static providerType = "http://bartoc.org/api-type/ols"
  static supports = {
    schemes: true,
    top: true,
    data: false,
    concepts: true,
    narrower: true,
    ancestors: true,
    types: false,
    suggest: false,
    search: false,
    auth: false,
    mappings: false,
    concordances: false,
    annotations: false,
    occurrences: false,
  }

  // #### CUSTOM METHODS ####

  /**
   * Constructs the full API URL for a given endpoint.
   * @param {Array} parts - Array of api parts (e.g., "[artifacts, <schemeShort>]")
   * @param {Object} params - An object containing query parameters as key-value pairs.
   * @returns {string} The full URL. Returns undefined if any part is undefined.
   * @private
   */
  _getApiUrl(parts, params) {
    // result = URL + endpointA (+ artefactID)? (+ endpointB)? (+ paramsString)?
    let result = this.uri || ""
    // Ensure the base URL ends with a slash and the endpoint starts with a slash
    if (result.endsWith("/")) {
      result = result.slice(0, -1)
    }
    for (const part of parts) {
      if (part) {
        result += "/" + part
      } else {
        return
      }
    }

    // If params are provided, append them as query parameters
    if (params) {
      const paramString = Object.keys(params)
        .map((k) => `${k}=${encodeURIComponent(params[k])}`)
        .join("&")
      result += (result.includes("?") ? "&" : "?") + paramString
    }
    return result
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
      scheme.issueTracker = [{url: ontology.tracker }]
    }
    if (ontology.language) {
      scheme.languages = ontology.language
    }
    if (ontology.ontologyId) {
      scheme.notation = [ontology.ontologyId]
    }
    if (ontology.license?.url) {
      scheme.license = [{uri: ontology.license.url}]
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
      concept.inScheme = [{uri: term.ontologyIri}]
    }
    return concept
  }

  // #### API REQUESTS ####

  async _request(url, config = {_skipAdditionalParameters: true}) {
    if (!url) {
      return
    }
    console.log("Requesting URL: ", `'${url}'`)
    try {
      const u = new URL(url)
      const inlineParams = Object.fromEntries(u.searchParams.entries())

      const result = await this.axios({
        method: "get",
        url: u.origin + u.pathname,
        params: {
          ...inlineParams,
          ...config.params, // explicit params win
        },
        ...config,
      })
      return result
    } catch (error) {
      console.error("Error requesting URL: ", url, error)
    }
    return null
  }





  // API REQUESTS SCHEMES

  async _getSchemesOls() {
    // https://api.terminology.tib.eu/api/v2/ontologies (pages!)
    const url = this._getApiUrl(["v2", "ontologies"], null)
    const pageOne = await this._request(url)
    if (!pageOne) {
      return null
    }
    let ontologies = pageOne.elements || []
    const totalPages = pageOne.totalPages || 0
    for (let n = 1; n <= totalPages; n++) {
      const urlN = this._getApiUrl(["v2", "ontologies"], {page: n})
      const pageN = await this._request(urlN)
      if (pageN) {
        ontologies = ontologies.concat(pageN.elements || [])
      }
    }
    return ontologies
  }

  async _getSchemesOlsLimit(limit) {
    // https://api.terminology.tib.eu/api/v2/ontologies (pages!)
    if (!limit || limit <= 0) {
      return await this._getSchemesOls()
    }
    const url = this._getApiUrl(["v2", "ontologies"], {size: limit})
    let response = await this._request(url)
    return response.elements || []
  }

  async _getSchemeOls(schemeParam) {
    if (schemeParam.short) {
      return await this._getSchemeFromShort(schemeParam.short)
    }
    if (schemeParam.uri) {
      return await this._getSchemeFromUri(schemeParam.uri)
    }
    return null
  }

  async _getSchemeFromShort(short) {
    // https://api.terminology.tib.eu/api/ontologies/envo
    const url = this._getApiUrl(["v2", "ontologies", short], null)
    return await this._request(url)
  }

  async _getSchemeFromUri(uri) {
    // https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl
    const url = this._getApiUrl(["v2", "ontologies"], {searchFields: "iri", search: uri})
    let response = await this._request(url)
    let ontologies = response.elements
    if (ontologies.length == 0) {
      return null
    }
    // if multiple, return the ontology with the shortest ontologyId (e.g., envo, not envo2021)
    return ontologies.reduce((shortest, current) => current.ontologyId.length < shortest.ontologyId.length ? current : shortest, ontologies[0])
  }

  // API REQUESTS CONCEPTS

  async _getConceptsOls(scheme, limit) {
    if (limit && limit > 0) {
      return await this._getConceptsOlsLimited(scheme, limit)
    }
    // https://api.terminology.tib.eu/api/ontologies/envo/terms
    const short = await this._schemeShortFromObj(scheme)
    if (!short) {
      return []
    }
    const url = this._getApiUrl(["v2", "ontologies", short, "classes"], null)
    let pageOne = await this._request(url)
    let terms = pageOne.elements || []
    const totalPages = pageOne.totalPages || 1
    for (let n = 1; n <= totalPages; n++) {
      const urlN = this._getApiUrl(["v2", "ontologies", short, "classes"], {page: n})
      const pageN = await this._request(urlN)
      if (pageN) {
        terms = terms.concat(pageN.elements || [])
      }
    }
    return terms
  }

  async _getConceptsOlsLimited(scheme, limit) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms
    const short = await this._schemeShortFromObj(scheme)
    if (!short) {
      return []
    }
    let url = this._getApiUrl(["v2", "ontologies", short, "classes"], {size: limit})
    let response = await this._request(url)
    if (response && response.elements) {
      return response.elements
    }
    return []
  }

  async _getConceptOls(concept) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms?id=BFO_0000001
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO:0000001
    // https://api.terminology.tib.eu/api/ontologies/envo/terms?iri=http://purl.obolibrary.org/obo/BFO_0000001
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http://purl.obolibrary.org/obo/BFO_0000001
    const short = await this._schemeShortFromObj(concept.inScheme[0])
    if (!short) {
      return null
    }
    let url = null
    if (concept.notation) {
      url = this._getApiUrl(["v2","ontologies", short, "classes"], {curie: concept.notation})
    } else if (concept.uri) {
      url = this._getApiUrl(["v2","ontologies", short, "classes"], {iri: concept.uri})
    }
    let response = await this._request(url)
    if (response && response.elements && response.elements.length > 0) {
      return response.elements[0]
    }
    return null
  }

  async _getTopOls(scheme) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms/roots
    const short = await this._schemeShortFromObj(scheme)
    if (!short) {
      return []
    }
    // let url = this._getApiUrl(["ontologies", short, "terms", "roots"], null)
    let url = this._getApiUrl(["v2","ontologies", short, "classes"], {hasDirectParents: "false"})
    //let url = this._getApiUrl(["v2","ontologies", short, "classes"], {hasDirectParents: false})
    // let url = this._getApiUrl(["v2","ontologies", short, "properties"], {hasDirectParents: false})
    let response = await this._request(url)
    if (response && response.elements) {
      return response.elements
    }
    return []
  }

  
  async _getNarrowerOls(concept) {
    const {short, iri} = await this._normalizeConceptObject(concept)
    if (!short || !iri) {
      return []
    }
    let iriDoubleEncoded = encodeURIComponent(encodeURIComponent(iri))
    let url = this._getApiUrl(["v2","ontologies", short, "classes", iriDoubleEncoded, "children"], null)
    let response = await this._request(url)
    if (response && response.elements) {
      return response.elements
    }
    return []
  }

  async _getAncestorsOls(concept) {
    const {short, iri} = await this._normalizeConceptObject(concept)
    if (!short || !iri) {
      return []
    }
    console.log("Getting ancestors for concept with short: ", short, " and iri: ", iri)
    let iriDoubleEncoded = encodeURIComponent(encodeURIComponent(iri))
    console.log("Double encoded IRI: ", iriDoubleEncoded)
    let url = this._getApiUrl(["v2","ontologies", short, "classes", iriDoubleEncoded, "ancestors"], null)
    let response = await this._request(url)
    if (response && response.elements) {
      return response.elements
    }
    return []

  }

  // UTILITIES

  async _getSchemeShort(uri) {
    // https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl
    let url = this._getApiUrl(["v2", "ontologies"], {searchFields: "iri", search: uri})
    let response = await this._request(url)
    let shorts = []
    for (const ontology of response.elements){
      shorts.push(ontology.ontologyId)
    }
    if (shorts.length == 0) {
      return null
    }
    // if multiple, return the shortest one (e.g., envo, not envo2021)
    return shorts.reduce((shortest, current) => current.length < shortest.length ? current : shortest)
  }

  async _schemeShortFromObj(scheme) {
    if (scheme.short) {
      return scheme.short
    }
    if (scheme.uri) {
      return await this._getSchemeShort(scheme.uri)
    }
    return null
  }

  async _normalizeConceptObject(concept) {
    let short = await this._schemeShortFromObj(concept.inScheme[0])
    let iri = concept.uri || await this._conceptIriFromObj(short, concept.notation)
    return {short, iri}
  }

  async _conceptIriFromObj(schemeShort, conceptNotation) {
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO:0000001
    let url = this._getApiUrl(["v2","ontologies", schemeShort, "classes"], {curie: conceptNotation})
    let response = await this._request(url)
    if (response && response.elements && response.elements.length > 0) {
      return response.elements[0].iri
    }
  }

  // #### OVERRIDE METHODS ####

  /**
   * will be called before the registry is initialized (i.e. it's `/status` endpoint is queries if necessasry)
   * @private
   */
  _prepare() {}

  /**
   * Sets up provider-specific properties.
   * Enables support for mappings in this provider.
   * will be called after registry is initialized (i.e. it's `/status` endpoint is queries if necessary), should be used to set properties on this.has and custom preparations
   * @private
   */
  _setup() {}

  /**
   * Retrieves all concept schemes from the OLS API.
   *
   * @param {Object} [params={}] - An object containing parameters for the request.
   * @param {Object[]} params.schemes - List of scheme objects to request specific schemes.
   *   { short: schemeShort, uri:schemeUri }
   * @param {Object[]} params.limit - Optional limit for results when requesting all schemes.
   * @returns {Promise<Array>} An array of JSKOS concept schemes.
   * @async
  */
  async getSchemes({schemes, limit, ..._config}) {
    let schemes_results = []
    let ontologies = []
    if (schemes) { // a specific scheme or list of schemes is requested
      for (const s of schemes) {
        let sc = await this._getSchemeOls(s)
        if (sc) {
          ontologies.push(sc)
        }
      }
    } else if (limit) { // limit is given
      ontologies = await this._getSchemesOlsLimit(limit)
    } else { // all schemes
      ontologies = await this._getSchemesOls()
    }

    for (const ontology of ontologies) { // transform to JSKOS
      let scheme = await this._ontologyToJSKOS(ontology)
      if (scheme) {
        schemes_results.push(scheme)
      } else {
        console.warn("JSKOS transformation failed for ontology: ", ontology)
      }
    }
    return schemes_results
  }

  /**
   * Retrieves all concepts from the OLS API.
   *
   * @param {Object} [params={}] - An object containing parameters for the request.
   * @param {Object[]} params.concepts - List of concept objects to request specific concepts.
   *  { notation: conceptNotation, uri: conceptUri, inScheme: [ { short: schemeShort, uri:schemeUri } ] }
   * @param {Object} params.scheme - A scheme object to request concepts from a specific scheme.
   *  { short: schemeShort, uri:schemeUri }
   * @param {number} params.limit - Optional limit for results when requesting concepts from a scheme.
   * @param {Object} params._config - Additional config options.
   * @returns {Promise<Array>} An array of JSKOS concepts.
   * @async
  */
  async getConcepts({concepts, scheme, limit, ..._config}) {
    let concept_results = []
    if (concepts) {
      for (const concept of concepts) {
        let termOls = await this._getConceptOls(concept)
        if (termOls) {
          const concept = await this._termToJSKOS(termOls)
          if (concept) {
            concept_results.push(concept)
          } else {
            console.warn("JSKOS transformation failed for term: ", termOls)
          }
        }
      }
    } else if (scheme) {
      const termsOls = await this._getConceptsOls(scheme, limit)
      for (const termOls of termsOls) {
        const concept = await this._termToJSKOS(termOls)
        if (concept) {
          concept_results.push(concept)
        } else {
          console.warn("JSKOS transformation failed for term: ", termOls)
        }
      }
    }
    return concept_results
  }

  /**
   * Returns top concepts for a concept scheme.
   *
   * @param {Object} [params={}] - An object containing parameters for the request.
   * @param {Object} params.scheme concept scheme object
   *   { short: schemeShort, uri:schemeUri }
   * @param {Object} params._config - Additional config options.
   * @returns {Object[]} array of JSKOS concept objects
   * @async
  */
  async getTop({ scheme, ..._config }) {
    let concept_results = []
    let termsOls = await this._getTopOls(scheme)
    for (const termOls of termsOls) {
      const concept = await this._termToJSKOS(termOls)
      if (concept) {
        concept_results.push(concept)
      } else {
        console.warn("JSKOS transformation failed for term: ", termOls)
      }
    }
    return concept_results
  }
  
  /**
   * Returns child concepts of a specific concept.
   *
   * @param {Object} params - An object containing parameters for the request.
   * @param {Object} params.concept concept object
   *  { notation: conceptNotation, uri: conceptUri, inScheme: [ { short: schemeShort, uri:schemeUri } ] }
   * @param {Object} params._config - Additional config options.
   * @returns {Object[]} array of JSKOS concept objects
   * @async
  */
  async getNarrower({ concept, ..._config }) {
    let concept_results = []
    let termsOls = await this._getNarrowerOls(concept)
    for (const termOls of termsOls) {
      const concept = await this._termToJSKOS(termOls)
      if (concept) {
        concept_results.push(concept)
      } else {
        console.warn("JSKOS transformation failed for term: ", termOls)
      }
    }
    return concept_results
  }
  
  /**
   * Returns ancestor concepts of a specific concept.
   *
   * @param {Object} params - An object containing parameters for the request.
   * @param {Object} params.concept concept object
   *  { notation: conceptNotation, uri: conceptUri, inScheme: [ { short: schemeShort, uri:schemeUri } ] }
   * @param {Object} params._config - Additional config options.
   * @returns {Object[]} array of JSKOS concept objects
   * @async
  */
  async getAncestors({ concept, ..._config }) {
    let concept_results = []
    let termsOls = await this._getAncestorsOls(concept)
    for (const termOls of termsOls) {
      const concept = await this._termToJSKOS(termOls)
      if (concept) {
        concept_results.push(concept)
      } else {
        console.warn("JSKOS transformation failed for term: ", termOls)
      }
    }
    return concept_results
  }

  /**
   * @private
   */
  get _language() {
    return this._jskos.language || this.languages[0] || this._defaultLanguages[0] || "en"
  }
}
