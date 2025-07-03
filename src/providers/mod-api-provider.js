import BaseProvider from "./base-provider.js"
import jskos from "jskos-tools"
import jsonld from "jsonld"
import context_mod from "./contexts/context_mod.js"
import context_jskos from "./contexts/context_jskos.js"
import fs from "fs"
/**
 * MOD API.
 *
 * MOD (Metadata Object Description) is a service that provides access to metadata artifacts such as vocabularies, concept schemes, and related resources via a RESTful API.
 *
 * initialization example:
 * ```json
 * {
 *   provider: "ModApi",
 *   languages: ["en"],
 *   defaultLanguages: ["en"],
 *   // url: "localhost:8080/api-gateway",
 *   uri: "https://terminology.services.base4nfdi.de/api-gateway",
 *   api: "https://terminology.services.base4nfdi.de/api-gateway"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ModApiProvider extends BaseProvider {
  // #### CUSTOM PROPERTIES ####

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
  
  _readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  }

  _artefactToJSKOS(artefact) {
    if (artefact["@id"]) {
      delete artefact["@id"]
    }

    // const context_mod = this._readJsonFile("./src/providers/contexts/context_mod.json")
    // const context_jskos = this._readJsonFile("./src/providers/contexts/context_jskos.json")

    artefact["@context"] = context_mod["@context"]

    return jsonld
      .expand(artefact)
      .then((expanded) => jsonld.compact(expanded, context_jskos))
      .then((compacted) => {
        jskos.clean(compacted)
        delete compacted["@context"]
        for (const key in compacted) {
          if (compacted[key]?.["@none"]) {
            compacted[key].en = compacted[key]["@none"]
            delete compacted[key]["@none"]
          }
        }
        jskos.clean(compacted)
        return compacted
      })
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
      console.log("Concept ID:", conceptID)
      const url = this._getApiUrl(["artefacts", schemeID[0], "resources/concepts", conceptID], null)
      console.log("Fetching concept from URL:", url)

      const response = await this.axios({
        ...config,
        method: "GET",
        url,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      console.log("concept:", response)
      console.log("")
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
    return this.languages[0] || this._defaultLanguages[0] || "en"
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
