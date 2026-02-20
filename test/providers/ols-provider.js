import test from "node:test"
import { cdk, addAllProviders } from "../../src/index.js"
import assert from "assert"
import fs from "fs"

// Set Provider

addAllProviders()
const provider = cdk.initializeRegistry({
  provider: "OlsApi",
  uri: "https://api.terminology.tib.eu/api/", // or "http://service.tib.eu/ts4tib/api", "http://www.ebi.ac.uk/ols/api", "https://www.ebi.ac.uk/ols4/api"
  language: "en",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})

// default values

const limitDefault = 50
const schemeVOCIDDefault = "envo"
const schemeUriDefault = "http://purl.obolibrary.org/obo/envo.owl"
const invalidDefault = "...invalid..."





// TEST GENERAL

test("OlsProvider is a class", () => {
  assert.equal(typeof provider, "object")
})

test("OlsProvider has expected methods", async () => {
  assert.equal(typeof provider.getSchemes, "function")
  assert.equal(typeof provider.getTop, "function")
  assert.equal(typeof provider.getConcepts, "function")
  assert.equal(typeof provider.getNarrower, "function")
  assert.equal(typeof provider.getAncestors, "function")
  assert.equal(typeof provider.suggest, "function")
  assert.equal(typeof provider.search, "function")
})





// TEST GETSCHEMES

test("OlsProvider.getSchemes - all schemes", async () => {
  const schemes = await provider.getSchemes()
  assert(Array.isArray(schemes))
  assert(schemes.length >= 200) // there are currently 200+ schemes in OLS, but this number can grow, so we check for a minimum
})

test("OlsProvider.getSchemes - limit", async () => {
  const schemesLimited = await provider.getSchemes({ limit: limitDefault })
  assert(Array.isArray(schemesLimited))
  assert(schemesLimited.length === limitDefault)
})

test("OlsProvider.getSchemes - specific scheme", async () => {
  const config = {schemes: [schemeUriDefault] }
  const configUri = { schemes: [{ uri: schemeUriDefault }] }
  const configVOCID = {schemes: [{ VOCID: schemeVOCIDDefault }]}
  
  const specificScheme = await provider.getSchemes(config)
  const specificSchemeUri = await provider.getSchemes(configUri)
  const specificSchemeVOCID = await provider.getSchemes(configVOCID)
  
  assert(Array.isArray(specificScheme) && Array.isArray(specificSchemeUri) && Array.isArray(specificSchemeVOCID))
  assert.equal(specificScheme.length, 1)
  assert.equal(specificSchemeUri.length, 1)
  assert.equal(specificSchemeVOCID.length, 1)
  assert.deepEqual(Object.keys(specificScheme[0]).sort(), Object.keys(specificSchemeUri[0]).sort())
  assert.deepEqual(Object.keys(specificScheme[0]).sort(), Object.keys(specificSchemeVOCID[0]).sort())
  const array = ["uri", "type", "prefLabel", "url", "notation"]
  array.forEach(key => {
    assert.notDeepStrictEqual(specificScheme[0][key], undefined, `Key '${key}' is missing in specificScheme result`)
    assert.notDeepStrictEqual(specificSchemeUri[0][key], undefined, `Key '${key}' is missing in specificSchemeUri result`)
    assert.notDeepStrictEqual(specificSchemeVOCID[0][key], undefined, `Key '${key}' is missing in specificSchemeVOCID result`)
    assert.deepStrictEqual(specificScheme[0][key], specificSchemeUri[0][key], `Value for key '${key}' does not match between specificScheme and specificSchemeUri results`)
    assert.deepStrictEqual(specificScheme[0][key], specificSchemeVOCID[0][key], `Value for key '${key}' does not match between specificScheme and specificSchemeVOCID results`)
  })
})

test("OlsProvider.getSchemes - non-existing scheme", async () => {
  const config = {schemes: [invalidDefault] }
  const nonExistingScheme = await provider.getSchemes(config)
  console.log("Non-existing scheme result: ", nonExistingScheme)
  assert(Array.isArray(nonExistingScheme))
  assert(nonExistingScheme.length === 0)
})

test("OlsProvider.getSchemes - valid JSKOS", async () => {
  const config = {schemes: [{VOCID: "bk"}] }
  const scheme = await provider.getSchemes(config)
  
  const bk_raw = fs.readFileSync("test/providers/ols-api/get-schemes-bk.jskos.json", "utf-8")
  const bk_jskos = JSON.parse(bk_raw)
  assert(Array.isArray(scheme))
  assert(scheme.length === 1)

  for (const key in bk_jskos[0]) {
    assert(scheme[0][key])
    assert.deepEqual(scheme[0][key], bk_jskos[0][key], `Value for key '${key}' does not match between scheme result and expected BK JSKOS`)
  }
})





// TEST GETTOP

test("OlsProvider.getTop - specific Scheme", async () => {
  const config = {schemes: [schemeUriDefault] }
  const configUri = { schemes: [{ uri: schemeUriDefault }] }
  const configVOCID = {schemes: [{ VOCID: schemeVOCIDDefault }]}

  const topConcepts = await provider.getTop(config)
  const topConceptsUri = await provider.getTop(configUri)
  const topConceptsVOCID = await provider.getTop(configVOCID)

  assert(Array.isArray(topConcepts) && Array.isArray(topConceptsUri) && Array.isArray(topConceptsVOCID))
  assert.equal(topConcepts.length, topConceptsUri.length)
  assert.equal(topConcepts.length, topConceptsVOCID.length)
  const array = topConcepts.keys()

  array.forEach(key => {
    assert.notDeepStrictEqual(topConcepts[key], undefined, `Key '${key}' is missing in topConcepts result`)
    assert.notDeepStrictEqual(topConceptsUri[key], undefined, `Key '${key}' is missing in topConceptsUri result`)
    assert.notDeepStrictEqual(topConceptsVOCID[key], undefined, `Key '${key}' is missing in topConceptsVOCID result`)
    assert.deepStrictEqual(topConcepts[key], topConceptsUri[key], `Value for key '${key}' does not match between topConcepts and topConceptsUri results`)
    assert.deepStrictEqual(topConcepts[key], topConceptsVOCID[key], `Value for key '${key}' does not match between topConcepts and topConceptsVOCID results`)
  })
})

test("OlsProvider.getTop - non-existing uri", async () => {
  const config = { scheme: invalidDefault }
  const topConcepts = await provider.getTop(config)
  assert(Array.isArray(topConcepts))
  assert(topConcepts.length === 0)
})

test("OlsProvider.getTop - non-existing VOCID", async () => {
  const config = { scheme: { VOCID: invalidDefault } }
  const topConcepts = await provider.getTop(config)
  assert(Array.isArray(topConcepts))
  assert(topConcepts.length === 0)
})

test("OlsProvider.getTop - no uri", async () => {
  const config = {}
  const topConcepts = await provider.getTop(config)
  console.log("Top concepts for non-existing scheme result: ", topConcepts)
  assert(Array.isArray(topConcepts))
  assert(topConcepts.length === 0)
})





// TEST GETCONCEPTS

test("OlsProvider.getConcepts - allConcepts", async () => {
    const config = {scheme: schemeUriDefault}
})

test("OlsProvider.getConcepts - specificConcept", async () => {
})

test("OlsProvider.getConcepts - specificConcept", async () => {
})
