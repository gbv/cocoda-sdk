import BaseProvider from "./base-provider.js"
import * as _ from "../utils/lodash.js"
import * as errors from "../errors/index.js"
import { listOfCapabilities } from "../utils/index.js"

/**
 * ```json
 * {
 *  "uri": "http://coli-conc.gbv.de/registry/skohub.io",
 *  "provider": "Skohub",
 *  "schemes": [
 *    {
 *      "uri": "https://w3id.org/class/esc/scheme",
 *    }
 *  ]
 * }
 */
export default class SkohubProvider extends BaseProvider {

  _prepare() {
    this.has.schemes = true
    this.has.top = true
    this.has.data = true
    this.has.concepts = true
    this.has.narrower = true
    this.has.ancestors = true
    this.has.suggest = false
    this.has.search = false
    // Explicitly set other capabilities to false
    listOfCapabilities.filter(c => !this.has[c]).forEach(c => {
      this.has[c] = false
    })
  }

  _setup() {
    this._jskos.schemes = this.schemes || []
    this._cache = {}
  }

  async getSchemes({ ...config }) {
    const { schemes } = this._jskos

    for (let i=0; i<schemes.length; i++) {
      schemes[i] = await this._loadScheme(schemes[i], config)
    }

    return schemes
  }

  async _loadScheme(scheme, config) {
    const { uri, topConcepts } = scheme

    if (!uri || topConcepts) {
      return scheme
    }

    const data = await this.axios({ ...config, url: `${uri}.json` })

    // TODO: if not found

    if (data.id !== uri) {
      throw new errors.InvalidRequestError({ message: "Skohub URL did not return expected concept scheme" })
    }

    const { title, preferredNamespaceUri, hasTopConcept, description } = data //, issued, created, modified, creator, publisher } = data

    scheme.prefLabel = title
    scheme.namespace = preferredNamespaceUri
    scheme.topConcepts = (hasTopConcept || []).map(c => this._mapConcept(c))

    // const hasNarrower = scheme.topConcepts.find(c => c.narrower && c.narrower.length)

    scheme.concepts = [null]
    // scheme.concepts = [...scheme.topConcepts]
    // if (hasNarrower) {
    //   scheme.concepts.push(null)
    // }

    // TODO: map remaining fields

    if (description) {
      scheme.definition = description
      // scopeNote values in JSKOS are arrays
      Object.keys(scheme.definition).forEach(key => {
        scheme.definition[key] = [scheme.definition[key]]
      })
    }

    // remove fields without value
    for (let key of Object.keys(scheme).filter(key => !scheme[key])) {
      delete scheme[key]
    }

    return scheme
  }

  async getTop({ scheme, ...config }) {
    if (!scheme || !scheme.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "scheme", message: "Missing scheme URI" })
    }

    scheme = this._jskos.schemes.find(s => s.uri === scheme.uri)
    if (scheme) {
      scheme = await this._loadScheme(scheme, config)
      return scheme.topConcepts
    } else {
      return []
    }
  }

  async getConcepts({ concepts, ...config }) {
    if (!_.isArray(concepts)) {
      concepts = [concepts]
    }
    concepts = concepts.map(c => ({ uri: c.uri, inScheme: c.inScheme }))

    const newConcepts = []
    for (let concept of concepts) {
      const { uri, inScheme } = concept

      if (!(inScheme && inScheme[0] && inScheme[0].uri)) {
        throw new errors.InvalidOrMissingParameterError({ parameter: "inScheme", message: "Missing inScheme URI" })
      }

      var scheme = this._jskos.schemes.find(s => s.uri === inScheme[0].uri)
      if (scheme) {
        scheme = await this._loadScheme(scheme, config)
      }
      if (!scheme) {
        continue
      }

      const found = this._cache[uri]
      if (found) {
        newConcepts.push(found)
      } else if (_.last(scheme.concepts) === null) {
        try {
          const loaded = await this._loadConcept(uri)
          if (loaded) {
            newConcepts.push(loaded)
            this._cache[loaded.uri] = loaded
          }
        } catch (error) {
          // Ignore error
        }
      }
    }
    return newConcepts
  }

  async getAncestors({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.ancestors && concept.ancestors[0] !== null) {
      return concept.ancestors
    }
    concept = (await this.getConcepts({ concepts: [concept], ...config }))[0]
    if (!concept || !concept.broader || !concept.broader.length) {
      return []
    }
    const broader = concept.broader[0]
    broader.inScheme = concept.inScheme
    return [broader].concat(await this.getAncestors({ concept: broader, ...config })).map(c => ({ uri: c.uri }))
  }

  async getNarrower({ concept, ...config }) {
    if (!concept || !concept.uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    if (concept.narrower && concept.narrower[0] !== null) {
      return concept.narrower
    }
    concept = await this._loadConcept(concept.uri, config)
    return concept.narrower
  }

  async _loadConcept(uri, config) {
    const data = await this.axios({ ...config, url: `${uri}.json` })

    // TODO: if not found

    if (data.id !== uri) {
      throw new errors.InvalidRequestError({ message: "Skohub URL did not return expected concept URI" })
    }

    return this._mapConcept(data)
  }

  _mapConcept(data) {
    const concept = { uri: data.id }

    concept.prefLabel = data.prefLabel
    concept.narrower = (data.narrower || []).map(c => this._mapConcept(c))
    concept.notation = data.notation || []
    if (data.broader && data.broader.id) {
      concept.broader = [{ uri: data.broader.id }]
    }
    if (data.inScheme && data.inScheme.id) {
      concept.inScheme = [{ uri: data.inScheme.id }]
    }
    if (data.scopeNote) {
      concept.scopeNote = data.scopeNote
      // scopeNote values in JSKOS are arrays
      Object.keys(concept.scopeNote).forEach(key => {
        concept.scopeNote[key] = [concept.scopeNote[key]]
      })
    }

    return concept
  }
}

SkohubProvider.providerName = "Skohub"
