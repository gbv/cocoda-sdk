import BaseProvider from "./base-provider.js"

const entityTypes = [{
  _api: "classes",
  uri: "http://www.w3.org/2002/07/owl#Class",
  prefLabel: {
    en: "Class",
    de: "Klasse",
  },
},{
  _api: "properties",
  uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
  prefLabel: {
    en: "Property",
    de: "Eigenschaft",
  },
},{
  _api: "individuals",
  uri: "http://www.w3.org/2002/07/owl#NamedIndividual",
  prefLabel: {
    en: "Individual",
    de: "Individuum",
  },
}]

const property = entityTypes.find(t => t._api === "properties")
const searchTypesDefault = entityTypes.map(t => t.uri) // old: ["http://www.w3.org/2002/07/owl#Class"]


/**
 * OLS API V2.
 *
 * The Ontology Lookup Service (OLS) hosts ontologies. Implementation is not fully completed yet.
 *
 * ```js
 * const provider = new OlsApiProvider({
 *   uri: "https://api.terminology.tib.eu/api/v2/",     // OLS API V2 base URL, alternative to use `endpoint`
 *   language: "en",         // default language to use for labels and descriptions
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
    data: false, // TODO
    concepts: true,
    narrower: true,
    ancestors: true,
    types: true,
    suggest: true,
    search: true,
  }

  constructor(config) {
    config.uri =  config.uri || config.endpoint
    super(config)
  }

  /**
   * Used by `registryForScheme` (see src/lib/CocodaSDK.js) to determine a provider config for a concept schceme.
   * TODO: make this obsolete
   */
  static _registryConfigForBartocApiConfig({ url } = {}) {
    if (url) {
      return { endpoint: url }
    }
  }

  async _propertyRootJskos(scheme) {
    const uri = scheme?.uri || await this._getScheme(scheme)?.iri
    return {
      uri: property.uri,
      prefLabel: { ...property.prefLabel },
      type: [
        "http://www.w3.org/2004/02/skos/core#Concept",
        property.uri,
      ],
      broader: [],
      narrower: [null],
      inScheme: [uri ? { uri: uri } : null],
    }
  }

  _isPropertyConcept(concept) {
    return this._isPropertyRootConcept(concept)
    || this._getConceptOls(concept).then(item => {
      return item._api === property._api
    })
  }

  _isPropertyRootConcept(concept) {
    return concept.uri === property.uri 
    || concept.notation === property._api
  }

  async _isPropertyRoot(concept) {
    const myproperty = await this._propertyRootJskos(concept.inScheme?.[0])
    for (const key of ["uri", "prefLabel", "type", "broader", "narrower", "inScheme"]) {
      if (JSON.stringify(concept[key]) !== JSON.stringify(myproperty[key])) {
        return false
      }
    }
    return true
  }

  /**
   * Constructs the full API URL for a given endpoint.
   */
  _getApiUrl(parts, params = {}) {
    const url = this.uri + parts.join("/")
    params = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null))
    params = new URLSearchParams(params)
    return params.size ? `${url}?${params}` : url
  }

  _ontologyToJSKOS(ontology) {
    // TODO: filter out skos concept schemes
    const lan = ontology.lang || this._language || "en"
    const scheme = {}
    if (ontology.iri) {
      scheme.uri = ontology.iri
    }
    scheme.type = [
      "http://www.w3.org/2004/02/skos/core#ConceptScheme",
    ]
    if (ontology["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]) {
      // TODO: should always be owl:Ontology?
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
      scheme.VOCID = ontology.ontologyId
      scheme.notation = [ontology.ontologyId]
    }
    if (ontology.license?.url) {
      scheme.license = [{ uri: ontology.license.url }]
    }
    return scheme
  }

  /**
   * OLS term to JSKOS concept
   * term._api determines entity type,  default: 'classes'
   */
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
    if (term.hasDirectParents || term._api === "properties") {
      concept.broader = [null]
    } else {
      concept.broader = []
    }
    if (term.iri) {
      concept.uri = term.iri
    }
    {
      let preflabelkeys = ["prefLabel", "http://www.w3.org/2004/02/skos/core#prefLabel", "label", "http://www.w3.org/2000/01/rdf-schema#label"]
      const value = preflabelkeys.map(key => term[key]?.value ?? term[key])
        .find(v => v != null && (!Array.isArray(v) || v.length > 0))
      if (value != null) {
        concept.prefLabel = {}
        concept.prefLabel[lan] = Array.isArray(value) ? value[0] : value
      }
    }
    const entityType = entityTypes.find(t => t._api === term._api) || entityTypes[0]
    concept.type = [
      "http://www.w3.org/2004/02/skos/core#Concept",
      entityType.uri,
    ]
    if (term.ontologyIri) {
      concept.inScheme = [{ uri: term.ontologyIri }]
    }
    return concept
  }

  // #### API REQUESTS ####

  // TODO: rename _skipAdditionalParameters
  async _request(url, config = { _skipAdditionalParameters: true }) {
    if (url) {
      url = new URL(url)
      const given = Object.fromEntries(url.searchParams.entries())
      return this.axios({
        method: "get",
        url: url.origin + url.pathname,
        params: {
          ...given,
          ...config.params, // explicit params win
        },
        ...config,
      })
    }
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

  /**
   * Returns entity types matching type URIs, default: all
   */
  _entityTypesFor(types) {
    const matching = types?.length ? entityTypes.filter(t => types.includes(t.uri)) : []
    return matching.length ? matching : entityTypes
  }

  async _getConceptOls(concept) {
    const VOCID = await this._getSchemeVOCID(concept?.inScheme?.[0])
    if (!VOCID) {
      return null
    }
    // notation is an array in JSKOS, but plain strings are accepted too
    const notation = [concept.notation].flat()[0]
    const params = notation
      ? { curie: notation }
      : concept.uri ? { iri: concept.uri } : null
    if (!params) {
      return null
    }
    for (const { _api } of this._entityTypesFor(concept.type)) {
      const response = await this._request(this._getApiUrl(["ontologies", VOCID, _api], params))
      const item = response?.elements?.[0]
      if (item) {
        return { ...item, _api }
      }
    }
    return null
  }

  async _searchOls(search, scheme, limit, types) {
    let items = []

    if (types?.length) {
      types = entityTypes.filter(t => types.includes(t.uri))
    } else {
      types = entityTypes
    }

    const VOCID = scheme ? await this._getSchemeVOCID(scheme) : null // if no scheme is given, search in all schemes
    if (!scheme || VOCID) {
      for (const { _api } of types) {
        const remaining = limit > 0 ? limit - items.length : 0 // calculate remaining if limit is set
        if (limit > 0 && remaining <= 0) {
          break
        }
        const found = await this._paginate([_api], { search: search, ontology: VOCID }, remaining)
        items.push(...found.map(item => ({ ...item, _api })))
      }
    }

    return items
  }

  // UTILITIES

  async _conceptIriFromObj(VOCID, conceptNotation, types) {
    // https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO:0000001
    const item = await this._getConceptOls({
      inScheme: [{ VOCID }],
      notation: [conceptNotation].flat(),
      type: types,
    })
    return item?.iri
  }

  get _language() {
    // TODO: cleanup
    return this._jskos.language || this.languages[0] || this._defaultLanguages[0] || "en"
  }

  async _getSchemeVOCID(scheme) {
    return scheme?.VOCID
      ? scheme.VOCID
      : this._getScheme(scheme).then(s => s?.ontologyId)
  }

  async _getScheme(scheme) {
    if (scheme) {
      const { VOCID, uri, notation, identifier } = scheme
      if (VOCID) {
        return this._request(this._getApiUrl(["ontologies", VOCID]))
      }
      if (uri) {
        scheme = await this._getSchemeFromUri(uri)
        if (scheme) {
          return scheme
        }
      }
      // VOCID is likely the notation
      if (notation?.[0] && (uri || identifier?.length)) {
        scheme = await this._request(this._getApiUrl(["ontologies", notation[0]]))
        if (scheme.iri === uri || identifier?.includes(scheme.iri)) {
          return scheme
        }
      }
      // Try other URIs 
      for (let id of (identifier || [])) {
        const found = await this._getSchemeFromUri(id)
        if (found) {
          return found
        }
      }
    }
  }

  async _getSchemeFromUri(uri) {
    if (uri) {
      const url = this._getApiUrl(["ontologies"], { searchFields: "iri", search: uri })
      const response = await this._request(url)
      const schemes = response?.elements || []
      return schemes.reduce((short, cur) => cur.ontologyId.length < short.ontologyId.length ? cur : short, schemes[0])
    }
    return null
  }

  // MAIN FUNCTIONS

  // TODO: query parameter are different: schemes are in "params.uri"?
  async getSchemes({ schemes, limit }) {
    let ontologies = []

    if (schemes) {
      ontologies = (await Promise.all(schemes.map(s => this._getScheme(s)))).filter(Boolean)
    } else if (limit > 0) {
      const url = this._getApiUrl(["ontologies"], { size: limit })
      const response = await this._request(url)
      ontologies = response.elements || []
    } else {
      ontologies = await this._paginate(["ontologies"], {})
    }

    return Promise.all(ontologies.map(scheme => this._ontologyToJSKOS(scheme)))
  }

  async getConcepts({ concepts, scheme, limit }) {
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
      if (VOCID) {
        for (const { _api } of entityTypes) {
          const items = await this._paginate(["ontologies", VOCID, _api], {}, limit)
          result.push(...items.map(item => this._termToJSKOS({ ...item, _api })))
        }
        if (limit > 0) {
          result = result.slice(0, limit)
        }
      }
    }
    return result
  }

  // Top, narrower and ancestors exist for classes in OLS
  // properties are rooted under a virtual rdf:Property (see _propertyRootJskos)

  async getTop({ scheme }) {
    const ontology = await this._getScheme(scheme)
    if (!ontology?.ontologyId) {
      return []
    }
    let response = await this._paginate(["ontologies", ontology.ontologyId, "classes"], { hasDirectParents: "false" }, null)
    const top = await Promise.all(response.map(item => this._termToJSKOS({ ...item, _api: "classes" })))
    top.push(await this._propertyRootJskos(scheme)) // add virtual property root
    return top
  }

  async _splitConcept(concept) {
    const obj = {}
    if (concept) {
      obj.VOCID = await this._getSchemeVOCID(concept?.inScheme?.[0]) // TODO: what if multiple schemes?
      obj.iri = concept.uri || await this._conceptIriFromObj(obj.VOCID, concept.notation, concept.type)
      if (obj.iri) {
        obj.iri = encodeURIComponent(encodeURIComponent(obj.iri))
      }
    }
    return obj
  }

  async getNarrower({ concept }) {
    if (!concept) {
      return []
    }
    const { VOCID, iri } = await this._splitConcept(concept)
    // properties
    if (this._isPropertyRootConcept(concept)) {
      const items = await this._paginate(["ontologies", VOCID, "properties"], { hasDirectParents: "false" }, null)
      return Promise.all(items.map(item => this._termToJSKOS({ ...item, _api: "properties" })))
    }
    // not properties
    if (!VOCID || !iri) {
      return []
    }
    const items = await this._paginate(["ontologies", VOCID, "classes", iri, "children"], {}, 0)
    return Promise.all(items.map(item => this._termToJSKOS({ ...item, _api: "classes" })))
  }

  async getAncestors({ concept }) {
    if (!concept) {
      return []
    }
    // properties
    if (this._isPropertyRootConcept(concept)) {
      return []
    }
    if (this._isPropertyConcept(concept)) {
      return [await this._propertyRootJskos(concept.inScheme?.[0]?.ontologyId, await this._getSchemeVOCID(concept?.inScheme?.[0]))]
    }
    // not properties
    const { VOCID, iri } = await this._splitConcept(concept)
    if (VOCID && iri) {
      let response = await this._paginate(["ontologies", VOCID, "classes", iri, "ancestors"], {}, null)
      return Promise.all(response.map(item => this._termToJSKOS({ ...item, _api: "classes" })))
    }
    return []
  }

  async getTypes() {
    return entityTypes.map(({uri, prefLabel}) => ({ uri, prefLabel}))
  }
  
  async search({ search, scheme = null, limit = 0, types = searchTypesDefault }) {
    let items = await this._searchOls(search, scheme, limit, types)
    return Promise.all(items.map(item => this._termToJSKOS(item)))
  }
}
