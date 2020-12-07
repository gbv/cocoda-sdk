const BaseProvider = require("./base-provider")
const _ = require("../utils/lodash")
const errors = require("../errors")

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
class SkohubProvider extends BaseProvider {

  _setup() {
    this._jskos.schemes = this.schemes || []
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

    const { title } = data //, description, issued, created, modified, creator, publisher } = data
    const { preferredNamespaceUri } = data //, preferredNamespacePrefix, isBasedOn, source } = data
    const { hasTopConcept } = data

    scheme.prefLabel = title
    scheme.namespace = preferredNamespaceUri
    scheme.topConcepts = (hasTopConcept || []).map(c => this._mapConcept(c))

    const hasNarrower = scheme.topConcepts.find(c => c.narrower && c.narrower.length)

    scheme.concepts = [...scheme.topConcepts]
    if (hasNarrower) {
      scheme.concepts.push(null)
    }

    // TODO: map remaining fields
      
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

      const found = scheme.concepts.find(c => (c && c.uri === uri))

      if (found) {
        newConcepts.push(found)
      } else if (_.last(scheme.concepts) === null) {
        const loaded = await this._loadConcept(uri)
        if (loaded) {
          newConcepts.push(loaded)
          // TODO: add it to scheme.concepts (caching)
        }
      }
    }
    
    return newConcepts
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

    // TODO: convert to JSKOS
      
    return concept 
  }
}

SkohubProvider.providerName = "Skohub"

module.exports = SkohubProvider
