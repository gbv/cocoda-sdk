import BaseProvider from "./base-provider.js"
import * as errors from "../errors/index.js"
import jskos from "jskos-tools"

/**
 * MESH API.
 *
 * MESH (Medical Subject Headings) RDF vocabulary.
 *
 * initialization example:
 * ```json
 * {
 *   provider: "MeshApi",
 *   uri: "https://id.nlm.nih.gov/mesh/sparql" // optional, default is "https://id.nlm.nih.gov/mesh/sparql"
 * }
 * ```
 *
 * @extends BaseProvider
 * @category Providers
 */
export default class MeshApiProvider extends BaseProvider {


  // #### PROPERTIES ####

  // - providerName (This is how a provider is identified in a "registry" object in field `provider`.)
  static providerName = "MeshApi"
  // - providerType (Optional BARTOC API type URI. Supported types: https://github.com/gbv/bartoc.org/blob/main/data/bartoc-api-types.concepts.csv, the URI prefix is "http://bartoc.org/api-type/".)
  static providerType = "http://bartoc.org/api-type/mesh" // "http://bartoc.org/en/node/391"
  // - supports (Optional object of supported capabilities. The keys should be values from this list: https://github.com/gbv/cocoda-sdk/blob/9145952398d6828004beb395c1d392a4d24e9288/src/utils/index.js#L159-L174; values should be a boolean. `false` values can be left out. They will be used to initialize `this.has` (see below). Alternatively, `this.has` can be filled in `_prepare` or `_setup`.)
  static supports = {
    schemes: true,
    concepts: true,
    narrower: true,
    suggest: true,
    search: true,
    
    data: false, // previously registered as supported but no data endpoint is available
    top: false,
    ancestors: false,
    types: false,
    auth: false,
    mappings: false,
    concordances: false,
    annotations: false,
    occurrences: false,
  }

  _defaultParams = {
    format: "JSON",
    limit: 100,
    offset: 0,
    inference: true,
    uri: "https://id.nlm.nih.gov/mesh/sparql",
  }

  _defaultHeaders = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  }
  // application/sparql-results+json;charset=utf-8 

  mesh = {
    uri: "http://id.nlm.nih.gov/mesh",
    identifier: [
      "http://bartoc.org/en/node/391",
      "http://www.wikidata.org/entity/Q199897",
    ],
    notation: ["MeSH"],
    prefLabel: {
      en: "Medical Subject Headings",
    },
    languages: ["en"],
    concepts: [null],
    topConcepts: [],
  }


  // #### CUSTOM METHODS ####
  
  /**
   * Constructs SPARQL Query for concepts. The query is constructed from the `where` parameter, which should be a valid SPARQL WHERE clause.
   * @param {Array} where - An array of SPARQL WHERE clauses to filter the concepts.
   * @returns {string} - A SPARQL query string to retrieve concepts from the MeSH API.
   * @private
   */
  _buildConceptQuery({ where }) {
    // TODO: Ordering
    //       ?d a meshv:Descriptor .
    return `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>

    SELECT ?d ?name ?dateCreated ?dateRevised ?identifier (GROUP_CONCAT(?broaderDescriptor;SEPARATOR=" ") as ?broader)
    FROM <http://id.nlm.nih.gov/mesh>
    WHERE {
      ?d rdfs:label ?name .
      ?d meshv:identifier ?identifier .
      ${where}
      OPTIONAL { ?d meshv:dateCreated ?dateCreated } .
      OPTIONAL { ?d meshv:dateRevised ?dateRevised } .
      OPTIONAL { ?d meshv:broaderDescriptor ?broaderDescriptor } .
    }
    GROUP BY ?d ?name ?dateCreated ?dateRevised ?identifier
    ORDER BY ?d
    `
  }

  /*
   * Converts the query result to a list of concepts.
   * @param {Object} result - The result object returned from the MeSH API query.
   * @returns {Array} - A list of concept objects.
   * @private
   */
  _queryResultToConcepts(result) {
    if (!result || !result.results || !result.results.bindings) {
      return []
    }
    return result.results.bindings.map(c => {
      const concept = {
        inScheme: [this.mesh],
        uri: c.d.value,
        notation: [c.identifier.value],
        prefLabel: {
          [c.name["xml:lang"]]: c.name.value,
        },
        broader: (c.broader.value || "").split(" ").filter(b => b.trim() !== "").map(b => ({ uri: b })),
      }
      if (c.dateCreated && c.dateCreated.value) {
        concept.created = c.dateCreated.value
      }
      if (c.dateRevised && c.dateRevised.value) {
        concept.modified = c.dateRevised.value
      }
      jskos.clean(concept)
      return concept
    })
  }

  async _query({query, limit, offset, ...config}) {
    if (!query) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "query" })
    }
    limit = limit || this._defaultParams.limit
    offset = offset || this._defaultParams.offset
    let url = this._api.api || this.uri || this._jskos.uri || this._jskos.url || this._jskos.api || this._defaultParams.uri

    let result = await this._request(url, {
      params: {
        ...this._defaultParams,
        ...(config.params || {}),
        query,
        limit,
        offset,
      },
      headers: this._defaultHeaders,
    })

    try {
      return this._queryResultToConcepts(result)
    } catch (error) {
      console.error(error)
      return []
    }
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept scheme.
   *
   * @param {Object} options
   * @param {Object} options.url API URL for server
   * @returns {Object} provider configuration
   */
  static _registryConfigForBartocApiConfig({ url, scheme } = {}) {
    if (!url || !scheme) {
      return null
    }
    return {
      api: url,
      schemes: [scheme],
    }
  }

  async _search({ scheme, search, limit, offset, ...config }) {
    if (!search) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "search" })
    }
    if (!scheme || !jskos.compare(scheme, this.mesh)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme" })
    }
    limit = limit || this._jskos.suggestResultLimit || this._defaultParams.limit
    offset = offset || this._defaultParams.offset
    // TODO: Do we need regexp escapaing?
    search = search.replace(/"/g, "\\\"")
    const query = this._buildConceptQuery({ where: `FILTER(REGEX(?name,"${search}","i"))` })
    return await this._query({ query, limit, offset, ...config })
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

  async getSchemes() {
    return [this.mesh]
  }

  async getTop() {
    return []
  }

  async getConcepts({ concepts, ...config }) {
    if (!concepts) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concepts" })
    }
    if (!Array.isArray(concepts)) {
      concepts = [concepts]
    }
    const query = this._buildConceptQuery({ where: `VALUES ?d { ${concepts.map(c => `<${c.uri}>`).join(" ")} } .` })
    return await this._query({ query, ...config })
  }

  async getNarrower({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    const query = this._buildConceptQuery({ where: `?d meshv:broaderDescriptor <${concept.uri}> .` })
    return await this._query({ query, ...config })
  }

  async suggest(config) {
    const search = config.search
    const results = await this._search(config)
    return [
      search,
      results.map(r => jskos.prefLabel(r, { fallbackToUri: false })),
      [],
      results.map(r => r.uri),
    ]
  }

  async search(config) {
    return this._search(config)
  }
}
