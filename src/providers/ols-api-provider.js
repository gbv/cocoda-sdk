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
 *   uri: "https://terminology.services.base4nfdi.de/api-gateway" // "http://localhost:8080/api-gateway" if api-gateway is running locally
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
    const scheme = {}
    return scheme
  }

  _termToJSKOS(term) {
    // const lan = term.language || this._language || "en"
    const concept = {}
    return concept
  }

  // #### API REQUESTS ####

  async _request(url, ..._config) {
    if (!url) {
      return
    }
    const result = await this.axios({
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ..._config,
    })
    if (!result?._url || Object.keys(result).length != 1){
      return result
    }
  }

  // API REQUESTS SCHEMES

  async _getSchemesOls(schemeParam) {
    // http://www.ebi.ac.uk/ols/api/ontologies  (ignore pages!) Listing ontologies
    return {}
  }

  async _getSchemesOlsLimit(limit) {
    // http://www.ebi.ac.uk/ols/api/ontologies  (pages!) Listing ontologies
    return {}
  }

  async _getSchemeOls(schemeParam) {
    // http://www.ebi.ac.uk/ols/api/ontologies/envo
    // https://www.ebi.ac.uk/ols4/api/v2/ontologies?searchFields=iri&search=http://purl.obolibrary.org/obo/envo.owl 
    return {}    
  }

  async _getSchemeFromShort(short) {
    // http://www.ebi.ac.uk/ols/api/ontologies/envo
    return {}
  }

  async _getSchemeFromUri(uri) {
    // https://www.ebi.ac.uk/ols4/api/v2/ontologies?searchFields=iri&search=http://purl.obolibrary.org/obo/envo.owl
    return {}
  }

  // API REQUESTS CONCEPTS

  async _getConceptsOls(scheme) {
    // http://www.ebi.ac.uk/ols/api/ontologies/envo/terms
    return {}
  }

  async _getConceptsOlsLimit(scheme, limit) {
    // http://www.ebi.ac.uk/ols/api/ontologies/envo/terms
    return {}
  }

  async _getConceptOls(concept) {
    // http://www.ebi.ac.uk/ols/api/ontologies/envo/terms?id=BFO_0000001
    // http://www.ebi.ac.uk/ols/api/ontologies/envo/terms?iri=http://purl.obolibrary.org/obo/BFO_0000001
    return {}
  }

  // UTILITIES

  _containsString(obj, searchString) {
    for (const key in obj) {
      const value = obj[key]

      if (typeof value === "string" && value.includes(searchString)) {
        return true
      }

      if (typeof value === "object" && value !== null) {
        if (this.containsString(value, searchString)) {
          return true
        }
      }
    }
    return false
  }

  async _getSchemesContaining(partstring) {
    let schemes = []
    const schemesOls = await this._getSchemesOls()
    for (const scheme of schemesOls) {
      if (this.containsString(scheme, partstring)) {
        schemes.push(scheme)
      }
    }
    return schemes
  }

  async _getSchemeShort(uri) {
    // https://www.ebi.ac.uk/ols4/api/v2/ontologies?searchFields=iri&search=http://purl.obolibrary.org/obo/envo.owl
    // get elements/ontologyId
    return {}
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
   * @param {Object} [params={}] - Optional parameters for the request.
   * @returns {Promise<Array>} An array of JSKOS concept schemes.
   * @async
   */
  async getSchemes({schemes, limit, ..._config}) {
    let schemes_results = []
    let ontologies = []
    if (schemes) {
      for (const s of schemes) {
        let sc = await this._getSchemeOls(s)
        if (sc) {
          ontologies.push(sc)
        }
      }
    } else {
      ontologies = await this._getSchemesOlsLimit(limit)
    }

    for (const ontology of ontologies) {
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
 * @param {Object} params - The options object.
 * @param {string[]} params.concepts - List of concept objects to request specific concepts.
 * @param {string} params.scheme - A scheme object to request concepts from a specific scheme.
 * @param {number} [params.limit] - Optional limit for results when requesting concepts from a scheme.
 * @param {Object} [params._config] - Additional config options.
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
   * @private
   */
  get _language() {
    return this._jskos.language || this.languages[0] || this._defaultLanguages[0] || "en"
  }
}
