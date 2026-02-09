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
    narrower: false,
    ancestors: false,
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
    // const lan = ontology.language || this._language || "en"
    // const scheme = {}
    // return scheme

    // TODO

    return ontology
  }

  _termToJSKOS(term) {
    // const lan = term.language || this._language || "en"
    // const concept = {}
    // return concept

    // TODO

    return term
  }

  // #### API REQUESTS ####

  async _request(url, ..._config) {
    if (!url) {
      return
    }
    console.log("Requesting URL: ", url)
    try {
      const result = await this.axios({
        method: "get",
        url,
        'Accept-Encoding': 'identity',
        'User-Agent': 'axios/1.11.0',
        ..._config,
      })
      if (!result?._url || Object.keys(result).length != 1){
        return result
      }
    } catch (error) {
      console.error("Error requesting URL: ", url, error)
      return null 
    }
  }





  // API REQUESTS SCHEMES

  async _getSchemesOls() {
    // https://api.terminology.tib.eu/api/ontologies  (ignore pages!) Listing ontologies
    const url = this._getApiUrl(["ontologies"], null)
    const pageOne = await this._request(url)
    if (!pageOne){
      return null
    }
    let ontologies = pageOne._embedded?.ontologies || []
    const totalPages = pageOne.page?.totalPages || 1
    for (let n = 1; n <= totalPages; n++) {
      const urlN = this._getApiUrl(["ontologies"], {page: n})
      const pageN = await this._request(urlN)
      if (pageN) {
        ontologies = ontologies.concat(pageN._embedded?.ontologies || [])
      }
    }
    return ontologies
  }

  async _getSchemesOlsLimit(limit) {
    // https://api.terminology.tib.eu/api/ontologies  (pages!) Listing ontologies
    if (!limit || limit <= 0) {
      return await this._getSchemesOls()
    }
    const url = this._getApiUrl(["ontologies"], {size: limit})
    let response = await this._request(url)
    return response._embedded?.ontologies || []
  }

  async _getSchemeOls(schemeParam) {
    // https://api.terminology.tib.eu/api/ontologies/envo
    // https://www.ebi.ac.uk/ols4/api/v2/ontologies?searchFields=iri&search=http://purl.obolibrary.org/obo/envo.owl 
    if (schemeParam.short) {
      return await this._getSchemeFromShort(schemeParam.short)
    } else if (schemeParam.uri) {
      return await this._getSchemeFromUri(schemeParam.uri)
    } else {
      return null
    }
  }

  async _getSchemeFromShort(short) {
    // https://api.terminology.tib.eu/api/ontologies/envo
    const url = this._getApiUrl(["ontologies", short], null)
    return await this._request(url)
  }

  async _getSchemeFromUri(uri) {
    // https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl
    const url = this._getApiUrl(["v2", "ontologies"], {searchFields: "iri", search: uri})
    let response = await this._request(url)
    let ontologies = response.elements
    return ontologies.reduce((shortest, current) => current.ontologyId.length < shortest.ontologyId.length ? current : shortest, ontologies[0])
  }

  // API REQUESTS CONCEPTS

  async _getConceptsOls(scheme) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms
    const short = await this._schemeShortFromObj(scheme)
    const url = this._getApiUrl(["ontologies", short, "terms"], null)
    let pageOne = await this._request(url)
    let terms = pageOne._embedded?.terms
    const totalPages = pageOne.page?.totalPages || 1
    for (let n = 2; n <= totalPages; n++) {
      const urlN = this._getApiUrl(["ontologies", short, "terms"], {page: n})
      const pageN = await this._request(urlN)
      if (pageN) {
        terms = terms.concat(pageN._embedded?.terms || [])
      }
    }
    return terms
  }

  async _getConceptsOlsLimit(scheme, limit) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms
    if (limit && limit > 0) {
      return await this._getConceptsOlsLimited(scheme, limit)
    }

    const short = await this._schemeShortFromObj(scheme)
    let url = this._getApiUrl(["ontologies", short, "terms"], null)
    let pageOne = await this._request(url)
    let terms = pageOne._embedded?.terms

    const totalPages = pageOne.page?.totalPages || 1
    for (let n = 1; n <= totalPages; n++) {
      const urlN = this._getApiUrl(["ontologies", short, "terms"], {page: n})
      const pageN = await this._request(urlN)
      if (pageN) {
        terms = terms.concat(pageN._embedded?.terms || [])
      }
    }
    return terms
  }

  async _getConceptsOlsLimited(scheme, limit) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms
    const short = await this._schemeShortFromObj(scheme)
    let url = this._getApiUrl(["ontologies", short, "terms"], {size: limit})
    let response = await this._request(url)
    if (response && response._embedded && response._embedded.terms) {
      return response._embedded?.terms
    }
    return []
  }

  async _getConceptOls(concept) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms?id=BFO_0000001
    // https://api.terminology.tib.eu/api/ontologies/envo/terms?iri=http://purl.obolibrary.org/obo/BFO_0000001
    const short = await this._schemeShortFromObj(concept.inScheme[0])
    let url = null
    if (concept.notation) {
      url = this._getApiUrl(["ontologies", short, "terms"], {id: concept.notation})
    } else if (concept.uri) {
      url = this._getApiUrl(["ontologies", short, "terms"], {iri: concept.uri})
    }
    let response = await this._request(url)
    if (response && response._embedded && response._embedded.terms) {
      return response._embedded.terms
    }
    return null
  }

  async _getTopOls(scheme) {
    // https://api.terminology.tib.eu/api/ontologies/envo/terms/roots
    const short = await this._schemeShortFromObj(scheme)
    let url = this._getApiUrl(["ontologies", short, "terms", "roots"], null)
    let response = await this._request(url)
    if (response && response._embedded && response._embedded.terms) {
      return response._embedded.terms || []
    }
  }

  // UTILITIES

  async _getSchemeShortManual(uri) {
    // get elements/ontologyId

    const url = this._getApiUrl(["ontologies"], null)
    const pageOne = await this._request(url)
    if (!pageOne){
      return []
    }
    let ontologies = pageOne._embedded?.ontologies || []
    for (const ontology of ontologies) {
      if (ontology.config?.versionIri == uri) {
        return ontology.ontologyId
      }
    }

    const totalPages = pageOne.page?.totalPages || 1
    for (let n = 1; n <= totalPages; n++) {
      const urlN = this._getApiUrl(["ontologies"], {page: n})
      const pageN = await this._request(urlN)
      if (pageN) {
        let ontologies = pageN._embedded?.ontologies || []
        for (const ontology of ontologies) {
          if (ontology.config?.versionIri == uri || ontology.config?.fileLocation == uri) {
            return ontology.ontologyId
          }
        }
      }
    }
    return null
  }

  async _getSchemeShort(uri) {
    // https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl
    let url = this._getApiUrl(["v2", "ontologies"], {searchFields: "iri", search: uri})
    let response = await this._request(url)
    let shorts = []
    for (const ontology of response.elements){
      shorts.push(ontology.ontologyId)
    }
    return shorts.reduce((shortest, current) => current.length < shortest.length ? current : shortest)
  }

  async _schemeShortFromObj(scheme) {
    if (scheme.short){
      return scheme.short
    } else if (scheme.uri) {
      return await this._getSchemeShort(scheme.uri)
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
      const termsOls = await this._getConceptsOlsLimit(scheme, limit)
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
     * @param {Object} config
     * @param {Object} config.scheme concept scheme object
     * @returns {Object[]} array of JSKOS concept objects
     */
    async getTop({ scheme, ...config }) {
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
   * @private
   */
  get _language() {
    return this._jskos.language || this.languages[0] || this._defaultLanguages[0] || "en"
  }
}
