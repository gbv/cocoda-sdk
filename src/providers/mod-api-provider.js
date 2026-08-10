import { isValidUri } from "jskos-tools"
import BaseProvider from "./base-provider.js"

/**
 * MOD API.
 *
 * MOD (Metadata Object Description) is a service that provides access to metadata artifacts such as vocabularies, concept schemes, and related resources via a RESTful API.
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ModApiProvider extends BaseProvider {

  // #### PROPERTIES ####

  static providerName = "ModApi"
  static providerType = "http://bartoc.org/api-type/mod-api"
  static supports = {
    registries: true,
    schemes: true,
    top: false,
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
   * @param {Array} endpoint - API Endpoint following the base URL
   * @param {Object} params - An object containing query parameters as key-value pairs.
   * @returns {string} The full URL. Returns undefined if any part is undefined.
   * @private
   */
  _getApiUrl(endpoint, params) {
    let result = `${this._api.api}${endpoint}`

    if (this._jskos && this._jskos.backendTimeout) {
      if (!params) {
        params = {}
      }
      if (!params.timeout) {
        params.timeout = this._jskos.backendTimeout
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
  
  /*
  _artefactToJSKOS(artefact) {
    switch (this._jskos.transformation) {
      //case "jsonld":
      //  return this._modToJskosJsonLD(artefact)
      case "manual":
        return this._modToJskosManual(artefact)
      default:
        // If no specific transformation is set, default to JSON-LD conversion
        return this._modToJskosJsonLD(artefact)
    }
  }

  _modToJskosJsonLD(artefact) {
    if (artefact["@id"]) {
      delete artefact["@id"]
    }

    artefact["@context"] = context_mod["@context"]

    return jsonld
      .expand(artefact)
      .then((expanded) => jsonld.compact(expanded, context_jskos))
      .then((compacted) => {
        jskos.clean(compacted)
        delete compacted["@context"]
        for (const key in compacted) {
          if (compacted[key]?.["@none"]) {
            compacted[key][this._language] = compacted[key]["@none"]
            delete compacted[key]["@none"]
          }
        }
        compacted = jskos.clean(compacted)
        compacted = this._repairJsonLD(compacted)

        return compacted
      })
  }

  _repairJsonLD(json){
    // This function is used to repair the JSON-LD context, translating erroneous keys
    const map = {
      narrower: "http://www.w3.org/2004/02/skos/core#narrower",
      altLabel: "http://www.w3.org/2004/02/skos/core#altLabel",
      definition: "http://www.w3.org/2004/02/skos/core#definition",
    }

    for (const key in map) {
      if (json[map[key]]) {
        json[key] = json[map[key]]
        delete json[map[key]]
      }
    }
    return json
  }
  */

  // _modToJskosManual(artefact) {
  _artefactToJSKOS(artefact) {
    const lan = artefact.language || this._language || "en"
    const item = {}
    // artefact.rightsHolder
    // artefact.backend_type
    // artefact.createdWith
    // artefact.keywords
    // artefact.contactPoint
    if (artefact.subject) {
      item.subject = [artefact.subject]
    }
    // artefact.obsolete // boolean
    // artefact.accrualMethod
    // artefact.accrualPeriodicity
    // artefact.status
    // artefact.bibliographicCitation
    // artefact.semanticArtefactRelation
    // artefact.coverage
    // artefact.competencyQuestion
    if (artefact.includedInDataCatalog) {
      item.api = [artefact.includedInDataCatalog]
    }
    // artefact.accessRights

    // TYPES
    if (artefact["@type"]) {
      item["@type"] = artefact["@type"]
    }
    if (artefact.type) {
      item.type = [artefact.type]
    }

    // NOTATION
    if (artefact.source_name) {
      item.notation = [artefact.source_name]
    }
    if (artefact.short_form){
      if (!item.notation) {
        item.notation = [artefact.short_form]
      } else {
        item.notation.push(artefact.short_form)
      }
    }
    if (artefact.label){
      item.prefLabel = {}
      item.prefLabel[lan] = []
      item.prefLabel[lan].push(artefact.label)
    }
    if (artefact.synonyms){
      item.altLabel = {}
      item.altLabel[lan] = artefact.synonyms
    }
    if (artefact.descriptions){
      item.definition = {}
      item.definition[lan] = artefact.descriptions
    }
    if (artefact.language){
      item.languages = artefact.language
    }

    // URLS
    if (artefact["@id"]) {
      item.uri = artefact["@id"]
    }
    if (artefact.iri) {
      item.iri = artefact.iri
    }
    if (artefact.identifier) {
      item.identifier = [artefact.identifier]
    }
    if (artefact.source) {
      item.source = [artefact.source]
    }
    if (artefact.source_url) {
      item.namespace = artefact.source_url
    }
    if (artefact.landingPage) {
      item.url = artefact.landingPage
    }

    // METADATA
    if (artefact.version) {
      item.version = artefact.version
    }
    // artefact.versionIRI
    if (artefact.modified) {
      item.modified = artefact.modified
    }
    if (artefact.created) {
      item.created = artefact.created
    }
    // item.startDate
    if (artefact.hasFormat) {
      item.format = artefact.hasFormat
    }
    if (artefact.license) {
      item.license = [artefact.license]
    }
    // TODO: MOD API does not return proper creator URIs
    /*
    if (artefact.creator) {
      item.creator = artefact.creator
    }
    // artefact.wasGeneratedBy
    if (artefact.contributor){
      item.contributor = {}
      item.contributor.prefLabel = {}
      item.contributor.prefLabel[lan] = artefact.contributor
    }
    if (artefact.publisher){
      item.publisher = {}
      item.publisher[lan] = artefact.publisher
    }
    */

    if (artefact.terminologies) {
      item.schemes = artefact.terminologies.map(({uri,label}) => {
        if (uri && isValidUri(uri)) {
          return label ? {uri, prefLabel:{und: label}} : {uri}
        }
      }).filter(Boolean)
    }


    // artefact.title
    if (artefact.released){
      item.issued = artefact.released
    }
    // artefact.acronym
    if (artefact.children){
      item.narrower = {}
      item.narrower[lan] = artefact.children
    }

    return item
  }

  // API REQUESTS REGISTRIES

  async _getRegistriesMod() {
    //https://terminology.services.base4nfdi.de/api-gateway/collections/
    const url = this._getApiUrl("collections/", null)
    return await this._request(url)
  }

  async _getRegistriesModLimit(limit) {
    const artifacts = await this._getRegistriesMod()
    if (limit && limit > 0) {
      return artifacts.slice(0, limit)
    }
    return artifacts
  }

  async _getRegistryMod(registryParam) {
    // filter from https://terminology.services.base4nfdi.de/api-gateway/collections/
    const artifacts = await this._getRegistriesMod()
    for (const registry of artifacts) {
      if (registry.uri && registry.uri === registryParam.uri) {
        return registry
      }
    }
  }

  // API REQUESTS SCHEMES

  async _getSchemesMod() {
    //https://terminology.services.base4nfdi.de/api-gateway/artefacts
    const url = this._getApiUrl("artefacts", null)
    return await this._request(url)
  }

  async _getSchemesModLimit(limit) {
    const artifacts = await this._getSchemesMod()
    if (limit && limit > 0) {
      return artifacts.slice(0, limit)
    }
    return artifacts
  }

  async _getSchemeMod(schemeParam) {
    //https://terminology.services.base4nfdi.de/api-gateway/artefacts/<schemeShort>
    // const schemeShort = await this._schemeShortFromObj(schemeParam)
    if (schemeParam.short) {
      return await this._getSchemeFromShort(schemeParam.short)
    } else if (schemeParam.uri) {
      return await this._getSchemeFromUri(schemeParam.uri)
    }
  }

  async _getSchemeFromShort(short) {
    const url = this._getApiUrl(`artefacts/${short}`, null)
    return await this._request(url)
  }

  async _getSchemeFromUri(uri) {
    const schemesMod = await this._getSchemesMod()
    if (!schemesMod){
      return
    }
    for (const scheme of await schemesMod) {
      if (
        scheme.source == uri
        || scheme.source_url == uri
        || scheme.source_name == uri
        || scheme["@id"] == uri
        || scheme.iri == uri
        || scheme.includedInDataCatalog && scheme.includedInDataCatalog.includes(uri)
      ) {
        return await scheme
      }
    }
  }

  // API REQUESTS CONCEPTS

  async _getConceptsMod(scheme) {
    // https://terminology.services.base4nfdi.de/api-gateway/artefacts/<schemeShort>/resources/concepts
    let schemeShort = await this._schemeShortFromObj(scheme)
    if (!schemeShort) {
      return []
    }

    // pull page 1
    const url = this._getApiUrl(`artefacts/${schemeShort}/resources/concepts`, null)
    const pageOne = await this._request(url)
    if (!pageOne){
      return []
    }
    const {page, totalPages, member: conceptsOne} = pageOne

    let concepts = []
    for (const concept of conceptsOne) {
      if (concept) {
        concepts.push(concept)
      }
    }

    // pull remaining pages
    for (let p = page+1; p <= totalPages; p++) {
      const urlPage = this._getApiUrl(`artefacts/${schemeShort}/resources/concepts`, {page: p})
      const pageP = await this._request(urlPage)
      if (!pageP){
        break
      }
      const {member: conceptsNew} = pageP
      for (const concept of conceptsNew) {
        if (concept) {
          concepts.push(concept)
        }
      }
    }
    return concepts
  }

  async _getConceptsModLimit(scheme, limit) {
    let concepts = await this._getConceptsMod(scheme)
    if (limit && limit > 0) {
      return concepts.slice(0, limit)
    }
    return concepts
  }

  async _getConceptMod(concept) {
    // https://terminology.services.base4nfdi.de/api-gateway/artefacts/<schemeShort>/resources/concepts/<conceptNotation>
    const {conceptNotation, schemeShort} = await this._conceptNotationFromObj(concept)
    // FIXME: notation may need to be escaped
    const url = this._getApiUrl(`artefacts/${schemeShort}/resources/concepts/${conceptNotation}`, null)
    return await this._request(url)
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
    const schemesMod = await this._getSchemesMod()
    for (const scheme of schemesMod) {
      if (this.containsString(scheme, partstring)) {
        schemes.push(scheme)
      }
    }
    return schemes
  }

  async _getSchemeShort(uri) {
    const schemeMod = await this._getSchemeFromUri(uri)
    if (schemeMod) {
      return await schemeMod.short_form.toLowerCase()
    }
  }

  _getconceptNotation(uri) {
    return uri.split("/").pop()
  }

  async _schemeShortFromObj(scheme) {
    if (scheme.short){
      return scheme.short
    } else if (scheme.uri) {
      return await this._getSchemeShort(scheme.uri)
    }
  }

  async _conceptNotationFromObj(concept) {
    if (!concept.inScheme || !concept.inScheme[0]) {
      return
    }
    let schemeShort = await this._schemeShortFromObj(concept.inScheme[0])
    let conceptNotation = concept.notation
    if (!conceptNotation){
      conceptNotation = await this._getconceptNotation(concept.uri)
    }
    return {conceptNotation: conceptNotation, schemeShort: schemeShort}
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
   * Retrieves all registries (terminology collections aka JSKOS Scheme Registries) from the MOD API.
   *
   * @param {Object} [params={}] - Optional parameters for the request.
   * @returns {Promise<Array>} An array of JSKOS concept schemes.
   * @async
   */
  async getRegistries({registries, limit, ..._config}) {
    let registry_results = []
    let artefacts = []
    if (registries) {
      for (const r of registries) {
        let sc = await this._getRegistryMod(r)
        if (sc) {
          artefacts.push(sc)
        }
      }
    } else {
      artefacts = await this._getRegistriesModLimit(limit)
    }

    for (const artefact of artefacts) {
      let scheme = await this._artefactToJSKOS(artefact)
      if (scheme) {
        registry_results.push(scheme)
      } else {
        console.warn("JSKOS transformation failed for artefact: ", artefact)
      }
    }
    return registry_results
  }


  /**
   * Retrieves all concept schemes from the MOD API.
   *
   * @param {Object} [params={}] - Optional parameters for the request.
   * @returns {Promise<Array>} An array of JSKOS concept schemes.
   * @async
   */
  async getSchemes({schemes, limit, ..._config}) {
    let schemes_results = []
    let artefacts = []
    if (schemes) {
      for (const s of schemes) {
        let sc = await this._getSchemeMod(s)
        if (sc) {
          artefacts.push(sc)
        }
      }
    } else {
      artefacts = await this._getSchemesModLimit(limit)
    }

    for (const artefact of artefacts) {
      let scheme = await this._artefactToJSKOS(artefact)
      if (scheme) {
        schemes_results.push(scheme)
      } else {
        console.warn("JSKOS transformation failed for artefact: ", artefact)
      }
    }
    return schemes_results
  }

  /**
 * Retrieves all concepts from the MOD API.
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
        let conceptMod = await this._getConceptMod(concept)
        if (conceptMod) {
          const concept = await this._artefactToJSKOS(conceptMod)
          if (concept) {
            concept_results.push(concept)
          } else {
            console.warn("JSKOS transformation failed for concept: ", conceptMod)
          }
        }
      }
    } else if (scheme) {
      const conceptsMod = await this._getConceptsModLimit(scheme, limit)
      for (const conceptMod of conceptsMod) {
        const conceptJ = await this._artefactToJSKOS(conceptMod)
        if (conceptJ) {
          concept_results.push(conceptJ)
        } else {
          console.warn("JSKOS transformation failed for concept: ", conceptMod)
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

  /**
   * Retrieves an array of mappings.
   * @returns {Array} An array containing mapping objects.
   */
  getMappings() {
    const mappings = []
    return mappings
  }
}
