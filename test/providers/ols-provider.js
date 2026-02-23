import OlsApiProvider from "../../src/providers/ols-api-provider.js"
import assert from "assert"
import fs from "fs"
import { mockRequests } from "./requests.js"

const provider = new OlsApiProvider({
  uri: "https://api.terminology.tib.eu/api/v2/",
  language: "en",
})

const missing = mockRequests(provider.axios, {
  dir: "test/providers/ols-provider/",
  // debug: true,
  downloadMissing: true,
}, {
  "https://api.terminology.tib.eu/api/v2/ontologies": "ontologies.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=members": "properties.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?page=1": "ontologies-1.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=__invalid__": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/__invalid__/classes?hasDirectParents=false": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?hasDirectParents=false": "top_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo/classes?hasDirectParents=false": "top_bfo_classes.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl": "search-iri_envo.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&ontology": "search-concept_entity.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity": "search-concept_entity.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&size=20": "search-concept_entity.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=1": "search-concept_entity-1.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=1&size=20": "search-concept_entity-1.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=2&size=20": "search-concept_entity-2.json",

  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=2": "search-concept_entity-2.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&ontology=envo": "search-concept-envo_entity.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FBFO_0000002": "search-concept_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO%3A0000002": "search-concept_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/ancestors": "ancestors_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/children": "narrower_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?size=50": "concepts-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo": "ontology_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bk": "ontology_bk.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bf": "ontology_bf.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo": "ontology_bfo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?size=50": "ontologies-50.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

const limitDefault = 50
const schemeVOCIDDefault = "envo"
const schemeUriDefault = "http://purl.obolibrary.org/obo/envo.owl"
const invalidDefault = "__invalid__"
const conceptUriDefault = "http://purl.obolibrary.org/obo/BFO_0000002"
const conceptNotationDefault = "BFO:0000002"
const searchDefault = "entity"

describe("OlsProvider.getSchemes", () => {

  it("request all schemes", async function () {
    const schemes = await provider.getSchemes()
    assert(Array.isArray(schemes))
    assert.equal(schemes.length, 40)
  })

  it("request limited schemes", async function () {
    const schemesLimited = await provider.getSchemes({ limit: limitDefault })
    assert(Array.isArray(schemesLimited))
    assert(schemesLimited.length === limitDefault)
  })

  it("request specific scheme, compare scheme specifications", async function () {
    const configUri = { schemes: [{ uri: schemeUriDefault }] }
    const configVOCID = { schemes: [{ VOCID: schemeVOCIDDefault }] }
    const specificSchemeUri = await provider.getSchemes(configUri)
    const specificSchemeVOCID = await provider.getSchemes(configVOCID)
    assert(Array.isArray(specificSchemeUri) && Array.isArray(specificSchemeVOCID))
    assert.equal(specificSchemeUri.length, 1)
    assert.equal(specificSchemeVOCID.length, 1)
    assert.deepEqual(Object.keys(specificSchemeUri[0]).sort(), Object.keys(specificSchemeUri[0]).sort())
    assert.deepEqual(Object.keys(specificSchemeUri[0]).sort(), Object.keys(specificSchemeVOCID[0]).sort())
    const array = ["uri", "type", "prefLabel", "url", "notation"]
    array.forEach(key => {
      assert.notDeepStrictEqual(specificSchemeUri[0][key], undefined, `Key '${key}' is missing in specificSchemeUri result`)
      assert.notDeepStrictEqual(specificSchemeVOCID[0][key], undefined, `Key '${key}' is missing in specificSchemeVOCID result`)
      assert.deepStrictEqual(specificSchemeUri[0][key], specificSchemeVOCID[0][key], `Value for key '${key}' does not match between specificSchemeUri and specificSchemeVOCID results`)
    })
  })

  it("request non-existing scheme", async function () {
    const config = { schemes: [invalidDefault] }
    const nonExistingScheme = await provider.getSchemes(config)
    assert(Array.isArray(nonExistingScheme))
    assert(nonExistingScheme.length === 0)
  })

  it("test JSKOS of bk", async function () {
    const config = { schemes: [{ VOCID: "bk" }] }
    const scheme = await provider.getSchemes(config)
    const bk_raw = fs.readFileSync("test/providers/ols-provider/jskos_bk.json", "utf-8")
    const bk_jskos = JSON.parse(bk_raw)
    assert(Array.isArray(scheme))
    assert(scheme.length === 1)
    for (const key in bk_jskos[0]) {
      assert(scheme[0][key])
      assert.deepEqual(scheme[0][key], bk_jskos[0][key], `Value for key '${key}' does not match between scheme result and expected BK JSKOS`)
    }
  })

  it("test JSKOS of two schemes", async function () {
    const config = { schemes: [{ VOCID: "bfo" }, { VOCID: "bf" }] }
    const scheme = await provider.getSchemes(config)
    const schemes_raw = fs.readFileSync("test/providers/ols-provider/jskos_ontology_bfo_bf.json", "utf-8")
    const schemes_jskos = JSON.parse(schemes_raw)
    assert(Array.isArray(scheme))
    assert(scheme.length === 2)
    const keys = Object.keys(schemes_jskos[0])
    assert(keys.length > 0)
    keys.forEach(key => {
      assert(scheme[0][key])
      assert.deepEqual(scheme[0][key], schemes_jskos[0][key], `Value for key '${key}' does not match between scheme result and expected JSKOS`)
    })
    const keys2 = Object.keys(schemes_jskos[1])
    assert(keys2.length > 0)
    keys2.forEach(key => {
      assert(scheme[1][key])
      assert.deepEqual(scheme[1][key], schemes_jskos[1][key], `Value for key '${key}' does not match between scheme result and expected JSKOS`)
    })
  })

})


describe("OlsProvider.getTop", () => {

  it("request top concepts of a specific scheme, compare scheme specifications", async function () {
    const config = { scheme: schemeUriDefault }
    const configUri = { scheme: { uri: schemeUriDefault } }
    const configVOCID = { scheme: { VOCID: schemeVOCIDDefault } }
    const topConcepts = await provider.getTop(config)
    const topConceptsUri = await provider.getTop(configUri)
    const topConceptsVOCID = await provider.getTop(configVOCID)
    assert(Array.isArray(topConcepts) && Array.isArray(topConceptsUri) && Array.isArray(topConceptsVOCID))
    assert.equal(topConcepts.length, topConceptsUri.length)
    assert.equal(topConcepts.length, topConceptsVOCID.length)
    Object.keys(topConcepts[0]).forEach(key => {
      if (!key.startsWith("_")) {
        assert.notDeepStrictEqual(topConcepts[0][key], undefined, `Key '${key}' is missing in topConcepts result`)
        assert.notDeepStrictEqual(topConceptsUri[0][key], undefined, `Key '${key}' is missing in topConceptsUri result`)
        assert.notDeepStrictEqual(topConceptsVOCID[0][key], undefined, `Key '${key}' is missing in topConceptsVOCID result`)
        assert.deepStrictEqual(topConcepts[0][key], topConceptsUri[0][key], `Value for key '${key}' does not match between topConcepts and topConceptsUri results`)
        assert.deepStrictEqual(topConcepts[0][key], topConceptsVOCID[0][key], `Value for key '${key}' does not match between topConcepts and topConceptsVOCID results`)
      }
    })
  })

  it("request top concepts of a non-existing scheme uri", async function () {
    const config = { scheme: invalidDefault }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 0)
  })

  it("request top concepts of a non-existing scheme VOCID", async function () {
    const config = { scheme: { VOCID: invalidDefault } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 0)
  })

  it("request top concepts without a scheme", async function () {
    const config = {}
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 0)
  })

  it("jskos test", async function () {
    const config = { scheme: { VOCID: "bfo" } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 1)
    const bfo_root_raw = fs.readFileSync("test/providers/ols-provider/jskos_top_bfo.json", "utf-8")
    const bfo_root_jskos = JSON.parse(bfo_root_raw)
    Object.keys(bfo_root_jskos[0]).forEach(key => {
      assert.notDeepStrictEqual(topConcepts[0][key], undefined, `Key '${key}' is missing in topConcepts result`)
      assert.deepStrictEqual(topConcepts[0][key], bfo_root_jskos[0][key], `Value for key '${key}' does not match between topConcepts and expected JSKOS`)
    })
  })

})


describe("OlsProvider.getConcepts", () => {

  it("allConcepts short, compare scheme specifications", async function () {
    const config = { scheme: schemeUriDefault, limit: limitDefault }
    const configUri = { scheme: { uri: schemeUriDefault }, limit: limitDefault }
    const configVOCID = { scheme: { VOCID: schemeVOCIDDefault }, limit: limitDefault }

    const concepts = await provider.getConcepts(config)
    const conceptsUri = await provider.getConcepts(configUri)
    const conceptsVOCID = await provider.getConcepts(configVOCID)

    assert(Array.isArray(concepts) && Array.isArray(conceptsUri) && Array.isArray(conceptsVOCID))
    assert.equal(concepts.length, limitDefault)
    assert.equal(conceptsUri.length, limitDefault)
    assert.equal(conceptsVOCID.length, limitDefault)

    const keys = Object.keys(concepts[0])
    assert(keys.length > 0)
    keys.forEach(key => {
      if (!key.startsWith("_")) {
        assert.deepEqual(concepts[0][key], conceptsUri[0][key])
        assert.deepEqual(concepts[0][key], conceptsVOCID[0][key])
      }
    })
  })

  // TODO: get concepts with pagination

  it("specificConcept´, compare concept specifications", async function () {
    const config = { concepts: [{ uri: conceptUriDefault, inScheme: [schemeUriDefault] }] }
    const configUri = { concepts: [{ uri: conceptUriDefault, inScheme: [{ uri: schemeUriDefault }] }] }
    const configVOCID = { concepts: [{ notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDDefault }] }] }

    const specificConcept = await provider.getConcepts(config)
    const specificConceptUri = await provider.getConcepts(configUri)
    const specificConceptVOCID = await provider.getConcepts(configVOCID)

    assert(Array.isArray(specificConcept) && Array.isArray(specificConceptUri) && Array.isArray(specificConceptVOCID))
    assert.equal(specificConcept.length, 1)
    assert.equal(specificConceptUri.length, 1)
    assert.equal(specificConceptVOCID.length, 1)

    const keys = Object.keys(specificConcept[0])
    assert(keys.length > 0)
    keys.forEach(key => {
      if (!key.startsWith("_")) {
        assert.deepEqual(specificConcept[0][key], specificConceptUri[0][key], `Value for key '${key}' does not match between specificConcept and specificConceptUri results`)
        assert.deepEqual(specificConcept[0][key], specificConceptVOCID[0][key], `Value for key '${key}' does not match between specificConcept and specificConceptVOCID results`)
      }
    })
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getConcepts({ concepts: [{ uri: invalidDefault }] })
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 0)
  })

  // TODO: get concept without inScheme
})



describe("OlsProvider.getNarrower", () => {

  it("request narrower concepts of a specific concept", async function () {
    const config = { concept: { uri: conceptUriDefault, inScheme: [schemeUriDefault] } }
    const configUri = { concept: { uri: conceptUriDefault, inScheme: [{ uri: schemeUriDefault }] } }
    const configVOCID = { concept: { notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDDefault }] } }

    const narrowerConcepts = await provider.getNarrower(config)
    const narrowerConceptsUri = await provider.getNarrower(configUri)
    const narrowerConceptsVOCID = await provider.getNarrower(configVOCID)

    assert(Array.isArray(narrowerConcepts) && Array.isArray(narrowerConceptsUri) && Array.isArray(narrowerConceptsVOCID))
    assert.equal(narrowerConcepts.length, 3)
    assert.equal(narrowerConceptsUri.length, 3)
    assert.equal(narrowerConceptsVOCID.length, 3)

    const keys = Object.keys(narrowerConcepts[0])
    keys.forEach(key => {
      if (!key.startsWith("_")) {
        assert.notDeepStrictEqual(narrowerConcepts[0][key], undefined, `Key '${key}' is missing in narrowerConcepts result`)
        assert.notDeepStrictEqual(narrowerConceptsUri[0][key], undefined, `Key '${key}' is missing in narrowerConceptsUri result`)
        assert.notDeepStrictEqual(narrowerConceptsVOCID[0][key], undefined, `Key '${key}' is missing in narrowerConceptsVOCID result`)
        assert.deepEqual(narrowerConcepts[0][key], narrowerConceptsUri[0][key], `Value for key '${key}' does not match between narrowerConcepts and narrowerConceptsUri results`)
        assert.deepEqual(narrowerConcepts[0][key], narrowerConceptsVOCID[0][key], `Value for key '${key}' does not match between narrowerConcepts and narrowerConceptsVOCID results`)
      }
    })
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getNarrower()
    assert.equal(concepts.length, 0)
  })

})





describe("OlsProvider.getAncestors", () => {

  it("request ancestors of a specific concept", async function () {
    const config = { concept: { uri: conceptUriDefault, inScheme: [schemeUriDefault] } }
    const configUri = { concept: { uri: conceptUriDefault, inScheme: [{ uri: schemeUriDefault }] } }
    const configVOCID = { concept: { notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDDefault }] } }

    const ancestors = await provider.getAncestors(config)
    const ancestorsUri = await provider.getAncestors(configUri)
    const ancestorsVOCID = await provider.getAncestors(configVOCID)

    assert(Array.isArray(ancestors) && Array.isArray(ancestorsUri) && Array.isArray(ancestorsVOCID))
    assert.equal(ancestors.length, 1)
    assert.equal(ancestorsUri.length, 1)
    assert.equal(ancestorsVOCID.length, 1)

    const keys = Object.keys(ancestors[0])
    keys.forEach(key => {
      if (!key.startsWith("_")) {
        assert.notDeepStrictEqual(ancestors[0][key], undefined, `Key '${key}' is missing in ancestors result`)
        assert.notDeepStrictEqual(ancestorsUri[0][key], undefined, `Key '${key}' is missing in ancestorsUri result`)
        assert.notDeepStrictEqual(ancestorsVOCID[0][key], undefined, `Key '${key}' is missing in ancestorsVOCID result`)
        assert.deepEqual(ancestors[0][key], ancestorsUri[0][key], `Value for key '${key}' does not match between ancestors and ancestorsUri results`)
        assert.deepEqual(ancestors[0][key], ancestorsVOCID[0][key], `Value for key '${key}' does not match between ancestors and ancestorsVOCID results`)
      }
    })
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getAncestors()
    assert.equal(concepts.length, 0)
  })

})


describe("OlsProvider.search", () => {

  it("search for a term in all schemes", async function () {
    const concepts = await provider.search({ search: searchDefault })
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 59)
  })

  it("search for a term in a specific scheme", async function () {
    const concepts = await provider.search({ search: searchDefault, scheme: schemeUriDefault })
    assert.equal(concepts.length, 1)
  })

  it("search with unknown type", async function () {
    const concepts = await provider.search({ search: searchDefault, types: ["un:known"] })
    assert.equal(concepts.length, 0)
  })

  it("search with limit", async function () {
    const concepts = await provider.search({ search: searchDefault, limit: 20 })
    assert.equal(concepts.length, 20)
  })

  it("search with property type", async function () {
    const types = ["un:known", "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"]
    const concepts = await provider.search({ search: "members", types })
    // console.log(concepts)
    // FIXME: jskos is not correct, must be Property
    assert.equal(concepts.length, 1)
  })
})


describe("OlsProvider.suggest", () => {

  it("suggest for a term in all schemes", async function () {
    const config = { search: searchDefault }
    const concepts = await provider.suggest(config)
    assert(Array.isArray(concepts))
    assert.equal(typeof concepts[0], "string")
    assert(Array.isArray(concepts[1]))
    const len = concepts[1].length
    assert(len >= 59)
    assert(Array.isArray(concepts[2]))
    assert.equal(concepts[2].length, len)
    assert(Array.isArray(concepts[3]))
    assert.equal(concepts[3].length, len)
  })

  it("suggest for a term in a specific scheme", async function () {
    const config = { search: searchDefault, scheme: schemeUriDefault }
    const concepts = await provider.suggest(config)
    assert.equal(typeof concepts[0], "string")
    assert(Array.isArray(concepts[1]))
    const len = concepts[1].length
    assert(len >= 1)
    assert(Array.isArray(concepts[2]))
    assert.equal(concepts[2].length, len)
    assert(Array.isArray(concepts[3]))
    assert.equal(concepts[3].length, len)
  })

})
