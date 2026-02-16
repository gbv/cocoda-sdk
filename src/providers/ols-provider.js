import test from "node:test";
import { cdk, addAllProviders } from "../index.js"
import * as jskos from "jskos-tools"
import assert, { deepEqual } from "assert"

// Provider
addAllProviders()
const provider = cdk.initializeRegistry({
  provider: "OlsApi",
  uri: "https://api.terminology.tib.eu/api/", // or "http://service.tib.eu/ts4tib/api", "http://www.ebi.ac.uk/ols/api", "https://www.ebi.ac.uk/ols4/api"
  language: "en",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})

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

test("OlsProvider.getSchemes - all schemes", async () => {
  const schemes = await provider.getSchemes()
  assert(Array.isArray(schemes))
  assert(schemes.length >= 200) // there are currently 200+ schemes in OLS, but this number can grow, so we check for a minimum
})

test("OlsProvider.getSchemes - limit", async () => {
  const schemesLimited = await provider.getSchemes({ limit: 50 })
  assert(Array.isArray(schemesLimited))
  assert(schemesLimited.length === 50)
})

test("OlsProvider.getSchemes - specific scheme", async () => {
  const config = {schemes: ["http://purl.obolibrary.org/obo/envo.owl"]}
  const configUri = { schemes: [{ uri: "http://purl.obolibrary.org/obo/envo.owl" }] }
  const configVOCID = {schemes: [{ VOCID: "envo" }]}
  
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
  const config = {schemes: ["...non-existing-scheme..."] }
  const nonExistingScheme = await provider.getSchemes(config)
  console.log("Non-existing scheme result: ", nonExistingScheme)
  assert(Array.isArray(nonExistingScheme))
  assert(nonExistingScheme.length === 0)
})