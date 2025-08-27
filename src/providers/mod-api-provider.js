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
 *   transformation: "manual", // "jsonld" for conversion via jsonld-concept or "manual" for manual conversion
 *   uri: "https://terminology.services.base4nfdi.de/api-gateway" // "http://localhost:8080/api-gateway" if api-gateway is running locally
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ModApiProvider extends BaseProvider {

  // #### STATIC PROPERTIES ####

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
   * @param {string} endpointA - The API endpoint (e.g., "/artifacts").
   * @param {string} artefactID - The ID of the artefact (optional).
   * @param {string} endpointB - An additional second API endpoint part (optional).
   * @param {Object} params - An object containing query parameters as key-value pairs.
   * @returns {string} The full URL.
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
      if (part){
        if (part && !part.startsWith("/")) {
          result += "/"
        }
        result += part
      } else {
        console.log("Part is empty, skipping", part, "in", parts)
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

    // ########## OBSOLETE ##########

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

    // ########## TYPES ##########

    if (artefact["@type"]) {
      concept["@type"] = artefact["@type"]
    }
    if (artefact.type) {
      concept.type = [artefact.type]
    }

    // ########## NOTATION ##########
    if (artefact.source_name) {
      concept.notation = [artefact.source_name]
    }
    // artefact.short_form
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

    // ########## URLS ##########

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

    // ########## METADATA ##########

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

    // ########## METADATA ##########

    // if (artefact.title){
    //   concept.prefLabel = {}
    //   concept.prefLabel[lan] = artefact.title
    // }
    if (artefact.released){
      concept.issued = artefact.released
    }
    // if (artefact.acronym){
    //   concept.notation = artefact.acronym
    // }
    if (artefact.children){
      concept.narrower = {}
      concept.narrower[lan] = artefact.children
    }

    return concept
  }


  _deepStripUnderscoreKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(this._deepStripUnderscoreKeys)
    } else if (obj !== null && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([key]) => !key.startsWith("_"))
          .map(([key, value]) => [key, this._deepStripUnderscoreKeys(value)]),
      )
    } else {
      return obj
    }
  }

  
  async _getSchemesMod() {
    const url = this._getApiUrl(["artefacts"], null)
    const artifacts = await this.axios({
      method: "get",
      url,
    })
    return artifacts
  }

  containsString(obj, searchString) {
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

  async _getSchemeID(url) {
    let source_name = []
    const schemesMod = await this._getSchemesMod()
    for (const scheme of schemesMod) {
      if (
        scheme.source == url
        || scheme.source_url == url
        || scheme.source_name == url
        || scheme["@id"] == url
        || scheme.iri == url
        || scheme.includedInDataCatalog && scheme.includedInDataCatalog.includes(url)
      ) {
        source_name.push(scheme.source_name)
      }
      
    }
    return source_name
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
  async getSchemes() {
    let schemes = []
    const artefacts = await this._getSchemesMod()
    for (const artefact of artefacts) {
      // var scheme = this._artefactToJSKOSConcept(artefact)
      let scheme = await this._artefactToJSKOS(artefact)
      if (scheme) {
        schemes.push(scheme)
      } else {
        console.warn("No scheme found for artefact: ", artefact)
      }
    }
    return schemes
  }

  /**
 * Retrieves all concepts from the MOD API.
 *
 * @param {Object} [params={}] - Optional parameters for the request.
 * @returns {Promise<Array>} An array of JSKOS concepts.
 * @async
 */
  async getConcepts({ concepts, ...config }) {
    let concept_results = []

    for (const concept of concepts) {
      if (!concept.uri || !concept.inScheme || !concept.inScheme[0]?.uri) {
        console.warn("Învalid concept found, skipping:", concept)
        continue
      }
      const schemeID = await this._getSchemeID(concept.inScheme[0].uri)
      if (!schemeID) {
        console.warn("No scheme ID found for concept:", concept)
        continue
      }

      const conceptID = concept.uri.split("/").pop()
      const url = this._getApiUrl(["artefacts", schemeID[0], "resources/concepts", conceptID], null)

      const response = await this.axios({
        ...config,
        method: "GET",
        url,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      const con = await this._artefactToJSKOS(response)
      if (con) {
        concept_results.push(con)
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
