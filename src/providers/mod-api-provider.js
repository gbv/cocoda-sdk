import BaseProvider from "./base-provider.js"
/*
import jskos from "jskos-tools"
import jsonld from "jsonld"
import context_mod from "./contexts/context_mod.js"
import context_jskos from "./contexts/context_jskos.js"
*/
/**
 * MOD API.
 *
 * MOD (Metadata Object Description) is a service that provides access to metadata artifacts such as vocabularies, concept schemes, and related resources via a RESTful API.
 *
 * initialization example:
 * ```json
 * {
 *   provider: "ModApi",
 *   language: "en",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
 *   cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
 *   <feature removed> transformation: "manual", // "jsonld" for conversion via jsonld-concept or "manual" for manual conversion
 *   uri: "https://terminology.services.base4nfdi.de/api-gateway" // "http://localhost:8080/api-gateway" if api-gateway is running locally
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ModApiProvider extends BaseProvider {

  // #### PROPERTIES ####

  // - providerName (This is how a provider is identified in a "registry" object in field `provider`.)
  static providerName = "ModApi"
  // - providerType (Optional BARTOC API type URI. Supported types: https://github.com/gbv/bartoc.org/blob/main/data/bartoc-api-types.concepts.csv, the URI prefix is "http://bartoc.org/api-type/".)
  static providerType = "http://bartoc.org/en/node/20333"
  // - supports (Optional object of supported capabilities. The keys should be values from this list: https://github.com/gbv/cocoda-sdk/blob/9145952398d6828004beb395c1d392a4d24e9288/src/utils/index.js#L159-L174; values should be a boolean. `false` values can be left out. They will be used to initialize `this.has` (see below). Alternatively, `this.has` can be filled in `_prepare` or `_setup`.)
  static supports = {
    schemes: true,
    top: false,
    data: false,
    concepts: false,
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
   * @param {Array} parts - Array of api parts (e.g., "[artifacts, <schemeId>]")
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
    const concept = {}
    // artefact.rightsHolder
    // artefact.backend_type
    // artefact.createdWith
    // artefact.keywords
    // artefact.contactPoint
    if (artefact.subject) {
      concept.subject = [artefact.subject]
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
      concept.api = [artefact.includedInDataCatalog]
    }
    // artefact.accessRights

    // TYPES
    if (artefact["@type"]) {
      concept["@type"] = artefact["@type"]
    }
    if (artefact.type) {
      concept.type = [artefact.type]
    }

    // NOTATION
    if (artefact.source_name) {
      concept.notation = [artefact.source_name]
    }
    if (artefact.short_form){
      if (!concept.notation) {
        concept.notation = [artefact.short_form]
      } else {
        concept.notation.push(artefact.short_form)
      }
    }
    if (artefact.label){
      concept.prefLabel = {}
      concept.prefLabel[lan] = []
      concept.prefLabel[lan].push(artefact.label)
    }
    if (artefact.synonyms){
      concept.altLabel = {}
      concept.altLabel[lan] = artefact.synonyms
    }
    if (artefact.descriptions){
      concept.definition = {}
      concept.definition[lan] = artefact.descriptions
    }
    if (artefact.language){
      concept.languages = artefact.language
    }

    // URLS
    if (artefact["@id"]) {
      concept.uri = artefact["@id"]
    }
    if (artefact.iri) {
      concept.iri = artefact.iri
    }
    if (artefact.identifier) {
      concept.identifier = [artefact.identifier]
    }
    if (artefact.source) {
      concept.source = [artefact.source]
    }
    if (artefact.source_url) {
      concept.namespace = artefact.source_url
    }
    if (artefact.landingPage) {
      concept.url = artefact.landingPage
    }

    // METADATA
    if (artefact.version) {
      concept.version = artefact.version
    }
    // artefact.versionIRI
    if (artefact.modified) {
      concept.modified = artefact.modified
    }
    if (artefact.created) {
      concept.created = artefact.created
    }
    // concept.startDate
    if (artefact.hasFormat) {
      concept.format = artefact.hasFormat
    }
    if (artefact.license) {
      concept.license = [artefact.license]
    }
    if (artefact.creator) {
      concept.creator = artefact.creator
    }
    // artefact.wasGeneratedBy
    if (artefact.contributor){
      concept.contributor = {}
      concept.contributor.prefLabel = {}
      concept.contributor.prefLabel[lan] = artefact.contributor
    }
    if (artefact.publisher){
      concept.publisher = {}
      concept.publisher[lan] = artefact.publisher
    }
    // artefact.title
    if (artefact.released){
      concept.issued = artefact.released
    }
    // artefact.acronym
    if (artefact.children){
      concept.narrower = {}
      concept.narrower[lan] = artefact.children
    }

    return concept
  }


  // API REQUESTS SCHEMES

  async _getSchemesMod() {
    //https://terminology.services.base4nfdi.de/api-gateway/artefacts
    const url = this._getApiUrl(["artefacts"], null)
    if (!url) {
      return []
    } 
    return await this.axios({
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  async _getSchemesModLimit(limit) {
    const artifacts = await this._getSchemesMod()
    if (limit && limit > 0) {
      return artifacts.slice(0, limit)
    }
    return artifacts
  }

  async _getSchemeMod(schemeParam) {
    //https://terminology.services.base4nfdi.de/api-gateway/artefacts/<schemeId>
    // const schemeId = await this._schemeIdFromObj(schemeParam)
    if (schemeParam.id) {
      return await this._getSchemeFromId(schemeParam.id)
    } else if (schemeParam.uri) {
      return await this._getSchemeFromUri(schemeParam.uri)
    }
  }

  async _getSchemeFromId(id) {
    const url = this._getApiUrl(["artefacts", id], null)
    if (!url) {
      return
    }
    const scheme = await this.axios({
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
    if (!scheme?._url || Object.keys(scheme).length != 1){
      return scheme
    }
  }

  async _getSchemeFromUri(uri) {
    const schemesMod = await this._getSchemesMod()
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
    // https://terminology.services.base4nfdi.de/api-gateway/artefacts/<schemeId>/resources/concepts
    let schemeId = await this._schemeIdFromObj(scheme)
    if (!schemeId) {
      return []
    }

    // pull page 1
    const url = this._getApiUrl(["artefacts", schemeId, "resources", "concepts"], null)
    if (!url) {
      return []
    }
    const pageOne = await this.axios({ 
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
    const {page, totalPages, member: conceptsOne} = pageOne

    let concepts = []
    for (const concept of conceptsOne) {
      if (concept) {
        concepts.push(concept)
      }
    }

    // pull remaining pages
    for (let p = page+1; p <= totalPages; p++) { 
      const urlPage = this._getApiUrl(["artefacts", schemeId, "resources", "concepts"], {page: p})
      if (!urlPage){
        break
      }
      const {member: conceptsNew} = await this.axios({
        method: "get",
        url: urlPage,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
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
    // https://terminology.services.base4nfdi.de/api-gateway/artefacts/<schemeId>/resources/concepts/<conceptId>
    const {conceptId, schemeId} = await this._conceptIdFromObj(concept)
    const url = this._getApiUrl(["artefacts", schemeId, "resources", "concepts", conceptId], null)
    if (!url) {
      return
    }
    const con = await this.axios({
      method: "get",
      url,
    })
    if (!con?._url || Object.keys(con).length != 1){
      return con
    }
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

  async _getSchemeID(uri) {
    const schemeMod = await this._getSchemeFromUri(uri)
    if (schemeMod) {
      return await schemeMod.short_form.toLowerCase()
    }
  }

  _getConceptID(uri) {
    return uri.split("/").pop()
  }

  async _schemeIdFromObj(scheme) {
    if (scheme.id){
      return scheme.id
    } else if (scheme.uri) {
      return await this._getSchemeID(scheme.uri)
    }
  }

  async _conceptIdFromObj(concept) {
    if (!concept.inScheme || !concept.inScheme[0]) {
      return
    }
    let schemeId = await this._schemeIdFromObj(concept.inScheme[0])
    let conceptId = concept.id
    if (!conceptId){
      conceptId = await this._getConceptID(concept.uri)
    }
    return {conceptId: conceptId, schemeId: schemeId}
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
        console.warn("No scheme found for artefact: ", artefact)
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
          // const conceptJ = await this._artefactToJSKOS(conceptMod)
          concept_results.push(conceptMod)
        }
      }
    } else if (scheme) {
      const conceptsMod = await this._getConceptsModLimit(scheme, limit)
      for (const conceptMod of conceptsMod) {
        const conceptJ = await this._artefactToJSKOS(conceptMod)
        if (conceptJ) {
          concept_results.push(conceptJ)
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
