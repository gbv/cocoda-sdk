import OlsApiProvider from "../../src/providers/ols-api-provider.js"
import assert from "assert"
import fs from "fs"
import { mockRequests } from "./requests.js"

const provider = new OlsApiProvider({
  endpoint: "https://api.terminology.tib.eu/api/v2/",
  language: "en",
})

const missing = mockRequests(provider.axios, {
  dir: "test/providers/ols-provider/",
  // debug: true,
  downloadMissing: true,
}, {
  // classes
  "https://api.terminology.tib.eu/api/v2/classes?search=entity": "search-concept_entity.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=1": "search-concept_entity-1.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&size=20": "search-concept_entity.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=1&size=20": "search-concept_entity-1.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&page=2&size=20": "search-concept_entity-2.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&ontology": "search-concept_entity.json",
  "https://api.terminology.tib.eu/api/v2/classes?search=entity&ontology=envo": "search-concept-envo_entity.json",
  // individuals
  "https://api.terminology.tib.eu/api/v2/individuals?search=entity": "empty.json",
  "https://api.terminology.tib.eu/api/v2/individuals?search=entity&size=20": "empty.json",
  "https://api.terminology.tib.eu/api/v2/individuals?search=entity&ontology=envo": "empty.json",
  // properties
  "https://api.terminology.tib.eu/api/v2/properties?search=entity": "search-property_entity.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=members": "properties.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=entity&ontology=envo": "search-property-envo_entity.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=entity&size=20": "search-property_entity-20.json",
  // ontologies
  "https://api.terminology.tib.eu/api/v2/ontologies": "ontologies.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?page=1": "ontologies-1.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?size=50": "ontologies-50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo": "ontology_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bk": "ontology_bk.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bf": "ontology_bf.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo": "ontology_bfo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/__invalid__": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?size=50": "concepts-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?size=50": "properties-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals?size=50": "individuals-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?hasDirectParents=false": "top_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?hasDirectParents=false": "top_envo_properties.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?hasDirectParents=false&page=1": "top_envo_properties-1.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo/classes?hasDirectParents=false": "top_bfo_classes.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/__invalid__/classes?hasDirectParents=false": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=__invalid__": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl": "search-iri_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FBFO_0000002": "search-concept_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FENVO_00002237": "search-concept_envo00002237.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO%3A0000002": "search-concept_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/children": "narrower_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/ancestors": "ancestors_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FENVO_00002237/ancestors": "ancestors_envo00002237.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

const limitDefault = 50
const schemeVOCIDDefault = "envo"
const schemeUriDefault = "http://purl.obolibrary.org/obo/envo.owl"
const invalidDefault = "__invalid__"
const conceptUriDefault = "http://purl.obolibrary.org/obo/BFO_0000002"
const propertyRdfUri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"
const propertyUriDefault = "http://purl.obolibrary.org/obo/ENVO_00002237"
const conceptNotationDefault = "BFO:0000002"
const searchDefault = "entity"

describe ("OlsProvider.getSchemes", () => {

  it("request all schemes", async function () {
    const schemes = await provider.getSchemes()
    assert(Array.isArray(schemes))
    assert.equal(schemes.length, 40)
  })

  it("request limited schemes", async function () {
    const schemesLimited = await provider.getSchemes({ limit: limitDefault })
    assert(Array.isArray(schemesLimited))
    assert.equal(schemesLimited.length, limitDefault)
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
    assert.equal(nonExistingScheme.length, 0)
  })

  it("test JSKOS of bk", async function () {
    const config = { schemes: [{ VOCID: "bk" }] }
    const scheme = await provider.getSchemes(config)
    const bk_raw = fs.readFileSync("test/providers/ols-provider/jskos_bk.json", "utf-8")
    const bk_jskos = JSON.parse(bk_raw)
    assert(Array.isArray(scheme))
    assert.equal(scheme.length, 1)
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
    assert.equal(scheme.length, 2)
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


describe ("OlsProvider.getTop", () => {

  it("request top concepts of a specific scheme Uri", async function () {
    const config = { scheme: { uri: schemeUriDefault } }
    const topConcepts = await provider.getTop(config)
    assert.equal(topConcepts.length, 15) // 14 classes + rdf:Property
    assert.equal(topConcepts.filter(c => c.uri != propertyRdfUri).length, 14)
    assert(topConcepts.find(c => c.uri === propertyRdfUri))
  })

  it("request top concepts of a specific scheme, VOCID", async function () {
    const config = { scheme: { VOCID: schemeVOCIDDefault } }
    const topConcepts = await provider.getTop(config)
    assert.equal(topConcepts.length, 15) // 14 classes + rdf:Property
    assert.equal(topConcepts.filter(c => c.uri != propertyRdfUri).length, 14)
    assert(topConcepts.find(c => c.uri === propertyRdfUri))
  })

  it("request top concepts of a non-existing scheme", async function () {
    const config = { scheme: { uri: invalidDefault  } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 0) // if the scheme does not exist, no top concepts can be returned and no property is added
  })

  it("request top concepts of a non-existing scheme VOCID", async function () {
    const config = { scheme: { VOCID: invalidDefault } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 0) // if the scheme does not exist, no top concepts can be returned and no property is added
  })

  it("request top concepts without a scheme", async function () {
    const config = {}
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 0) // without scheme, no top concepts can be returned and no property is added
  })

  it("jskos test", async function () {
    const config = { scheme: { VOCID: "bfo" } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 2) // 1 class + rdf:Property

    const bfo_root_raw = fs.readFileSync("test/providers/ols-provider/jskos_top_bfo.json", "utf-8")
    const bfo_root_jskos = JSON.parse(bfo_root_raw)
    Object.keys(bfo_root_jskos[0]).forEach(key => {
      assert.notDeepStrictEqual(topConcepts[0][key], undefined, `Key '${key}' is missing in topConcepts result`)
      assert.deepStrictEqual(topConcepts[0][key], bfo_root_jskos[0][key], `Value for key '${key}' does not match between topConcepts and expected JSKOS`)
    })
  })

})


describe ("OlsProvider.getConcepts", () => {

  it("allConcepts short, compare scheme specifications", async function () {
    const configUri = { scheme: { uri: schemeUriDefault }, limit: limitDefault }
    const configVOCID = { scheme: { VOCID: schemeVOCIDDefault }, limit: limitDefault }

    const conceptsUri = await provider.getConcepts(configUri)
    const conceptsVOCID = await provider.getConcepts(configVOCID)

    assert.equal(conceptsUri.length, limitDefault)
    assert.equal(conceptsVOCID.length, limitDefault)
  })

  // TODO: get concepts with pagination

  it("specificConcept, uri", async function () {
    const config = { concepts: [{ uri: conceptUriDefault, inScheme: [{ uri: schemeUriDefault }] }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 1)
  })

  it("specificConcept, notation", async function () {
    const config = { concepts: [{ notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDDefault }] }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 1)
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getConcepts({ concepts: [{ uri: invalidDefault }] })
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 0)
  })

  it("concept, no inScheme", async function () {
    const config = { concepts: [{ uri: conceptUriDefault }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 0) // if no inScheme is provided, the concept cannot be found
  })

  it ("property concept, uri", async function () {
    const config = { concepts: [{ uri: propertyUriDefault, inScheme: [{ uri: schemeUriDefault }] }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 1)
    assert.deepEqual(specificConcept[0].broader, [null]) // property concept has broader concept
  })
})


describe ("OlsProvider.getNarrower", () => {
  

  it("request narrower concepts of a specific concept, uri", async function () {
    const config = { concept: { uri: conceptUriDefault, inScheme: [{ uri: schemeUriDefault }] } }
    const narrowerConcepts = await provider.getNarrower(config)
    assert.equal(narrowerConcepts.length, 3)
  })

  it("request narrower concepts of a specific concept, notation", async function () {
    const config = { concept: { notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDDefault }] } }
    const narrowerConcepts = await provider.getNarrower(config)
    assert.equal(narrowerConcepts.length, 3)
  })

  it("narrower of rdf:Property", async function () {
    const concept = { uri: propertyRdfUri, inScheme: [{ uri: schemeUriDefault }] }
    const config = { concept: concept }
    assert(provider._isPropertyConcept(concept))
    assert(provider._isPropertyRootConcept(concept))
    const narrower = await provider.getNarrower(config)
    assert.equal(narrower.length, 40) // should get all properties. shortened to 2 pages, 40 entries for testing purposes, see top_envo_properties.json
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getNarrower()
    assert.equal(concepts.length, 0)
  })

})


describe("OlsProvider.getAncestors", () => {

  it("request ancestors of a specific concept, uri", async function () {
    const config = { concept: { uri: conceptUriDefault, inScheme: [{ uri: schemeUriDefault }] } }
    const ancestors = await provider.getAncestors(config)
    assert.equal(ancestors.length, 1)

  })

  it("request ancestors of a specific concept, notation", async function () {
    const config = { concept: { notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDDefault }] } }
    const ancestors = await provider.getAncestors(config)
    assert.equal(ancestors.length, 1)
  })

  it("ancestor of rdf:Property", async function () {
    const concept = { uri: propertyRdfUri, inScheme: [{ uri: schemeUriDefault }] }
    const config = { concept: concept }
    assert(provider._isPropertyConcept(concept))
    assert(provider._isPropertyRootConcept(concept))
    const ancestors = await provider.getAncestors(config)
    assert.equal(ancestors.length, 0)
  })

  it("ancestor of a property", async function () {
    const concept = { uri: propertyUriDefault, inScheme: [{ uri: schemeUriDefault }] }
    const config = { concept: concept }
    const ancestors = await provider.getAncestors(config)
    assert(provider._isPropertyConcept(concept))
    assert(!provider._isPropertyRootConcept(concept))
    assert.equal(ancestors.length, 1)
    assert(await provider._isPropertyRoot(ancestors[0]))
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getAncestors()
    assert.equal(concepts.length, 0)
  })

})


describe ("OlsProvider.search", () => {

  it("search for a term in all schemes", async function () {
    const concepts = await provider.search({ search: searchDefault })
    // console.log(concepts.map(c => ({ l: c.prefLabel, n: c.notation, t: c.type })))
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 49) // 2 pages 40 classes and individuals (shortened, actually 59 classes + 5 individuals) + 9 properties
  })

  it("search for a term in a specific scheme", async function () {
    const concepts = await provider.search({ search: searchDefault, scheme: { uri: schemeUriDefault } })
    const expectedlen = 2  // 1 class + 1 property
    assert.equal(concepts.length, expectedlen)
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
    const types = ["un:known", propertyRdfUri]
    const concepts = await provider.search({ search: "members", types })
    // console.log(concepts)
    // FIXME: jskos is not correct, must be Property
    assert.equal(concepts.length, 1)
  })
})


describe ("OlsProvider.suggest", () => {

  it("suggest for a term in all schemes", async function () {
    const config = { search: searchDefault }
    const concepts = await provider.suggest(config)
    assert(Array.isArray(concepts))
    assert.equal(typeof concepts[0], "string")
    const expectedlen = 49 // 2 pages 40 classes and individuals (shortened, actually 59 classes + 5 individuals) + 9 properties
    assert(Array.isArray(concepts[1]))
    assert(Array.isArray(concepts[2]))
    assert(Array.isArray(concepts[3]))
    assert.equal(concepts[1].length, expectedlen)
    assert.equal(concepts[2].length, expectedlen)
    assert.equal(concepts[3].length, expectedlen)
  })

  it("suggest for a term in a specific scheme", async function () {
    const config = { search: searchDefault, scheme: { uri: schemeUriDefault } }
    const concepts = await provider.suggest(config)
    assert.equal(typeof concepts[0], "string")
    const expectedlen = 2  // 1 class + 1 property
    assert(Array.isArray(concepts[1]))
    assert(Array.isArray(concepts[2]))
    assert(Array.isArray(concepts[3]))
    assert.equal(concepts[1].length, expectedlen)
    assert.equal(concepts[2].length, expectedlen)
    assert.equal(concepts[3].length, expectedlen)
  })

})
