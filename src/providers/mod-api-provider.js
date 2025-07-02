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
 *   uri: "http://localhost:8080/api-gateway",
 *   api: "http://localhost:8080/api-gateway"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class ModApiProvider extends BaseProvider {
  // #### CUSTOM PROPERTIES ####
  // - url (The base URL of the MOD API. This is the endpoint where the API can be accessed.)
  // url = "https://ts4nfdi-api-gateway.prod.km.k8s.zbmed.de/api-gateway"
  //  url = "http://localhost:8080/api-gateway"

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
  _getApiUrl(endpointA, artefactShort, endpointB, params) {
    // result = URL + endpointA (+ artefactID)? (+ endpointB)? (+ paramsString)?
    let result = this.uri || ""
    // Ensure the base URL ends with a slash and the endpoint starts with a slash
    if (result.endsWith("/")) {
      result = result.slice(0, -1)
    }
    // If endpointA is provided, append it to the URL
    if (endpointA) {
      if (!endpointA.startsWith("/")) {
        endpointA = "/" + endpointA
      }
      result += endpointA
    }
    // If artefactShort is provided, append it to the URL
    if (artefactShort) {
      if (!artefactShort.startsWith("/")) {
        artefactShort = "/" + artefactShort
      }
      result += artefactShort
    }
    // If endpointB is provided, append it to the URL
    if (endpointB) {
      if (!endpointB.startsWith("/")) {
        endpointB = "/" + endpointB
      }
      result += endpointB
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

  // #### OVERRIDE METHODS ####

  // - _prepare
  /**
   * will be called before the registry is initialized (i.e. it's `/status` endpoint is queries if necessasry)
   * @private
   */
  _prepare() {}

  // - _setup
  /**
   * Sets up provider-specific properties.
   * Enables support for mappings in this provider.
   * will be called after registry is initialized (i.e. it's `/status` endpoint is queries if necessary), should be used to set properties on this.has and custom preparations
   * @private
   */
  _setup() {}

  // - isAuthorizedFor: override if you want to customize
  // - supportsScheme: override if you want to customize
  // - getRegistries
  // - getSchemes
  /**
   * Retrieves all concept schemes from the MOD API.
   *
   * @param {Object} [params={}] - Optional parameters for the request.
   * @returns {Promise<Array>} An array of JSKOS concept schemes.
   * @async
   */
  async getSchemes() {
    let schemes = []
    const url = this._getApiUrl("artefacts", null, null, null)
    const artifacts = await this.axios({
      method: "get",
      url,
    })
    for (const artefact of artifacts) {
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
