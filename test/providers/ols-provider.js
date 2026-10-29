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
  "https://api.terminology.tib.eu/api/v2/classes?search=Bubble+Sort": "empty.json",
  // individuals
  "https://api.terminology.tib.eu/api/v2/individuals?search=entity": "empty.json",
  "https://api.terminology.tib.eu/api/v2/individuals?search=entity&size=20": "empty.json",
  "https://api.terminology.tib.eu/api/v2/individuals?search=entity&ontology=envo": "empty.json",
  "https://api.terminology.tib.eu/api/v2/individuals?search=Bubble+Sort": "search-individual_bubble_sort.json",
  // properties
  "https://api.terminology.tib.eu/api/v2/properties?search=entity": "search-property_entity.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=members": "properties.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=entity&ontology=envo": "search-property-envo_entity.json",
  "https://api.terminology.tib.eu/api/v2/properties?search=Bubble+Sort": "empty.json",
  // ontologies
  "https://api.terminology.tib.eu/api/v2/ontologies": "ontologies.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?page=1": "ontologies-1.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?size=50": "ontologies-50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo": "ontology_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bk": "ontology_bk.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bf": "ontology_bf.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo": "ontology_bfo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/__invalid__": "empty.json",
  
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo/classes?hasDirectParents=false": "top_bfo_classes.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo/properties?hasDirectParents=false": "top_bfo_properties.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo/properties?hasDirectParents=false&page=1": "top_bfo_properties-1.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/bfo/individuals?hasDirectParents=false": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/__invalid__/classes?hasDirectParents=false": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=__invalid__": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2Fenvo.owl": "search-iri_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri&search=https%3A%2F%2Fw3id.org%2Famv": "search-iri_amv.json",

  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?size=50": "concepts-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?hasDirectParents=false": "top_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FBFO_0000002": "search-concept_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FIAO_0000118": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes?curie=BFO%3A0000002": "search-concept_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/children": "narrower_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/ancestors": "ancestors_bfo0000002.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FIAO_0000118/ancestors": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?size=50": "properties-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?hasDirectParents=false": "top_envo_properties.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?hasDirectParents=false&page=1": "top_envo_properties-1.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/children": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/ancestors": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FENVO_00002237/ancestors": "ancestors_properties_envo00002237.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FIAO_0000118/ancestors": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/properties?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2FIAO_0000118": "search_iao0000118_envo.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals?size=50": "individuals-envo_50.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals?hasDirectParents=false": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/children": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FBFO_0000002/ancestors": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FENVO_00002237/ancestors": "ancestors_individuals_envo00002237.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/envo/individuals/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FIAO_0000118/ancestors": "empty.json",
  
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/classes?curie=RO%3A0018034": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FRO_0018034/children": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FRO_0018034/ancestors": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/classes?iri=http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23Property": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/classes?curie=properties": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/properties/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FRO_0018034/children": "children-ro-properties.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/properties?curie=RO%3A0018034": "search-property_ro0018034.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/properties/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FRO_0018034/ancestors": "ancestors_properties_ro0018034.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/properties?iri=http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23Property": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/properties?curie=properties": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/individuals/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FRO_0018034/children": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/individuals/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FRO_0018034/ancestors": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/individuals?iri=http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23Property": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/ro/individuals?curie=properties": "empty.json",
  
  "https://api.terminology.tib.eu/api/v2/ontologies/amv/classes/http%253A%252F%252Fpurl.org%252Fdc%252Fterms%252Fdate/children": "empty.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/amv/properties/http%253A%252F%252Fpurl.org%252Fdc%252Fterms%252Fdate/children": "children-amv-properties.json",
  "https://api.terminology.tib.eu/api/v2/ontologies/amv/individuals/http%253A%252F%252Fpurl.org%252Fdc%252Fterms%252Fdate/children": "children-amv-individuals.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

const limitDefault = 50
const schemeVOCIDENVO = "envo"
const schemeUriEnvo = "http://purl.obolibrary.org/obo/envo.owl"
const invalidDefault = "__invalid__"
const conceptUriBfo = "http://purl.obolibrary.org/obo/BFO_0000002"
const propertyRdfUri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"
// const propertyUriDefault = "http://purl.obolibrary.org/obo/ENVO_00002237"
const propertyUriDefault = "http://purl.obolibrary.org/obo/IAO_0000118"
const conceptNotationDefault = "BFO:0000002"
const searchDefault = "entity"
const schemeRO = { VOCID: "ro" }
const conceptRO = { notation: "RO:0018034", inScheme: [schemeRO] }
const label = "is protonated form of"


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
    const configUri = { schemes: [{ uri: schemeUriEnvo }] }
    const configVOCID = { schemes: [{ VOCID: schemeVOCIDENVO }] }
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
    const config = { scheme: { uri: schemeUriEnvo } }
    const topConcepts = await provider.getTop(config)
    assert.equal(topConcepts.filter(concept => concept.type?.includes("http://www.w3.org/2002/07/owl#Class")).length, 14)
    assert.equal(topConcepts.filter(concept => concept.type?.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property")).length, 40)
  })

  it("request top concepts of a specific scheme, VOCID", async function () {
    const config = { scheme: { VOCID: schemeVOCIDENVO } }
    const topConcepts = await provider.getTop(config)
    assert.equal(topConcepts.filter(concept => concept.type?.includes("http://www.w3.org/2002/07/owl#Class")).length, 14)
    assert.equal(topConcepts.filter(concept => concept.type?.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property")).length, 40)
  })

  it("request top concepts of a non-existing scheme", async function () {
    const config = { scheme: { uri: invalidDefault  } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 0) // if the scheme does not exist, no top concepts can be returned
  })

  it("request top concepts of a non-existing scheme VOCID", async function () {
    const config = { scheme: { VOCID: invalidDefault } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 0) // if the scheme does not exist, no top concepts can be returned
  })

  it("request top concepts without a scheme", async function () {
    const config = {}
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.length, 0) // without scheme, no top concepts can be returned
  })

  it("jskos test", async function () {
    const config = { scheme: { VOCID: "bfo" } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert.equal(topConcepts.filter(concept => concept.type?.includes("http://www.w3.org/2002/07/owl#Class")).length, 1)
    assert.equal(topConcepts.filter(concept => concept.type?.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property")).length, 22)

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
    const configUri = { scheme: { uri: schemeUriEnvo }, limit: limitDefault }
    const configVOCID = { scheme: { VOCID: schemeVOCIDENVO }, limit: limitDefault }

    const conceptsUri = await provider.getConcepts(configUri)
    const conceptsVOCID = await provider.getConcepts(configVOCID)

    assert.equal(conceptsUri.length, limitDefault)
    assert.equal(conceptsVOCID.length, limitDefault)
  })

  // TODO: get concepts with pagination

  it("specificConcept, uri", async function () {
    const config = { concepts: [{ uri: conceptUriBfo, inScheme: [{ uri: schemeUriEnvo }] }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 1)
  })

  it("specificConcept, notation", async function () {
    const config = { concepts: [{ notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDENVO }] }] }
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
    const config = { concepts: [{ uri: conceptUriBfo }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 0) // if no inScheme is provided, the concept cannot be found
  })

  it ("property concept, uri", async function () {
    const config = { concepts: [{ uri: propertyUriDefault, inScheme: [{ uri: schemeUriEnvo }] }] }
    const specificConcept = await provider.getConcepts(config)
    assert(Array.isArray(specificConcept))
    assert.equal(specificConcept.length, 1)
  })
  
  it("get property", async function () {
    let concepts = await provider.getConcepts({ concepts: [conceptRO] })
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 1)
    assert.equal(concepts[0].prefLabel.en, label)
    assert.deepStrictEqual(concepts[0].narrower, [null])
    assert.deepStrictEqual(concepts[0].broader, [null])
  })

})


describe ("OlsProvider.getNarrower", () => {
  

  it("request narrower concepts of a specific concept, uri", async function () {
    const config = { concept: { uri: conceptUriBfo, inScheme: [{ uri: schemeUriEnvo }] } }
    const narrowerConcepts = await provider.getNarrower(config)
    assert.equal(narrowerConcepts.length, 3)
  })

  it("request narrower concepts of a specific concept, notation", async function () {
    const config = { concept: { notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDENVO }] } }
    const narrowerConcepts = await provider.getNarrower(config)
    assert.equal(narrowerConcepts.length, 3)
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getNarrower()
    assert.equal(concepts.length, 0)
  })

  it("get narrower property", async function () {
    let narrower = await provider.getNarrower({ concept: conceptRO })
    assert(Array.isArray(narrower))
    assert(narrower.length> 0)
  })

  it("get narrower amv date", async function () {
    let config = {concept:{uri:"http://purl.org/dc/terms/date"},scheme:{uri:"https://w3id.org/amv"}}
    let narrower = await provider.getNarrower(config)
    assert(Array.isArray(narrower))
    assert(narrower.length> 0)
    narrower.map( narr => {
      assert(narr.uri && narr.notation)
    })
  })

})


describe("OlsProvider.getAncestors", () => {

  it("request ancestors of a specific concept, uri", async function () {
    const config = { concept: { uri: conceptUriBfo, inScheme: [{ uri: schemeUriEnvo }] } }
    const ancestors = await provider.getAncestors(config)
    assert.equal(ancestors.length, 1)
  })

  it("request ancestors of a specific concept, notation", async function () {
    const config = { concept: { notation: conceptNotationDefault, inScheme: [{ VOCID: schemeVOCIDENVO }] } }
    const ancestors = await provider.getAncestors(config)
    assert.equal(ancestors.length, 1)
  })

  it("ancestor of a top property", async function () {
    const concept = { uri: propertyUriDefault, inScheme: [{ uri: schemeUriEnvo }] }
    const config = { concept: concept }
    const ancestors = await provider.getAncestors(config)
    assert.equal(ancestors.length, 0)
  })

  it("ancestor of a property", async function () {
    let ancestors = await provider.getAncestors({ concept: conceptRO })
    assert(Array.isArray(ancestors))
    assert.equal(ancestors.length, 1)
  })

  it("non-existing concept", async function () {
    const concepts = await provider.getAncestors()
    assert.equal(concepts.length, 0)
  })

})


describe ("OlsProvider.search", () => {

  it("search for a term in all schemes", async function () {
    const concepts = await provider.search({ search: searchDefault })
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 49) // 2 pages 40 classes and individuals (shortened, actually 59 classes + 5 individuals) + 9 properties
  })

  it("search for a term in a specific scheme", async function () {
    const concepts = await provider.search({ search: searchDefault, scheme: { uri: schemeUriEnvo } })
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
    assert.deepStrictEqual(concepts[0].type, ["http://www.w3.org/2004/02/skos/core#Concept", propertyRdfUri])
    assert.equal(concepts.length, 1)
  })

  it("search for \"Bubble Sort\" in all schemes", async function () {
    const concepts = await provider.search({ search: "Bubble Sort" })
    assert.equal(concepts.length, 1)
    assert(Array.isArray(concepts))
  })

})


describe ("OlsProvider.suggest", () => {

  it("suggest for a term in all schemes", async function () {
    const config = { search: searchDefault }
    const concepts = await provider.suggest(config)
    assert(Array.isArray(concepts))
    assert.equal(typeof concepts[0], "string")
    assert(Array.isArray(concepts[1]))
    assert(Array.isArray(concepts[2]))
    assert(Array.isArray(concepts[3]))
    const expectedlen = 49 // 2 pages 40 classes and individuals (shortened, actually 59 classes + 5 individuals) + 9 properties
    assert.equal(concepts[1].length, expectedlen)
    assert.equal(concepts[2].length, expectedlen)
    assert.equal(concepts[3].length, expectedlen)
  })

  it("suggest for a term in a specific scheme", async function () {
    const config = { search: searchDefault, scheme: { uri: schemeUriEnvo } }
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