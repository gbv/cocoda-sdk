import { cdk, addAllProviders } from "../../src/index.js"
import assert from "assert"
import fs from "fs"

addAllProviders()
const provider = cdk.initializeRegistry({
  provider: "OlsApi",
  uri: "https://api.terminology.tib.eu/api/", // or "http://service.tib.eu/ts4tib/api", "http://www.ebi.ac.uk/ols/api", "https://www.ebi.ac.uk/ols4/api"
  language: "en",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})

const limitDefault = 50
const limitLongDefault = 1000
const schemeVOCIDDefault = "envo"
const schemeUriDefault = "http://purl.obolibrary.org/obo/envo.owl"
const invalidDefault = "__invalid__"
const conceptUriDefault = "http://purl.obolibrary.org/obo/BFO_0000002"
const conceptNotationDefault = "BFO:0000002"
const searchDefault = "entity"





describe("OlsProvider general", () => {

  it("is a class", () => {
    assert.equal(typeof provider, "object")
  })

  it("has expected methods", async () => {
    assert.equal(typeof provider.getSchemes, "function")
    assert.equal(typeof provider.getTop, "function")
    assert.equal(typeof provider.getConcepts, "function")
    assert.equal(typeof provider.getNarrower, "function")
    assert.equal(typeof provider.getAncestors, "function")
    assert.equal(typeof provider.suggest, "function")
    assert.equal(typeof provider.search, "function")
  })
  
})

describe("OlsProvider.getSchemes", () => {

  it("request all schemes", async () => {
    this.timeout(10000);
    const schemes = await provider.getSchemes()
    assert(Array.isArray(schemes))
    assert(schemes.length >= 200) // there are currently 200+ schemes in OLS, but this number can grow, so we check for a minimum
  })

  it("request limited schemes", async () => {
    const schemesLimited = await provider.getSchemes({ limit: limitDefault })
    assert(Array.isArray(schemesLimited))
    assert(schemesLimited.length === limitDefault)
  })

  it("request specific scheme, compare scheme specifications", async () => {
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

  it("request non-existing scheme", async () => {
    const config = {schemes: [invalidDefault] }
    const nonExistingScheme = await provider.getSchemes(config)
    assert(Array.isArray(nonExistingScheme))
    assert(nonExistingScheme.length === 0)
  })

  it("test JSKOS of bk", async () => {
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

  it("test JSKOS of two schemes", async () => {
    const config = {schemes: [{VOCID: "bfo"}, {VOCID: "bf"} ] }
    const scheme = await provider.getSchemes(config)
    const schemes_raw = fs.readFileSync("test/providers/ols-api/get-schemes.jskos.json", "utf-8")
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

  it("request top concepts of a specific scheme, compare scheme specifications", async () => {
    const config = {scheme: schemeUriDefault }
    const configUri = { scheme: { uri: schemeUriDefault } }
    const configVOCID = {scheme: { VOCID: schemeVOCIDDefault }}
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

  it("request top concepts of a non-existing scheme uri", async () => {
    const config = { scheme: invalidDefault }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 0)
  })

  it("request top concepts of a non-existing scheme VOCID", async () => {
    const config = { scheme: { VOCID: invalidDefault } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 0)
  })

  it("request top concepts without a scheme", async () => {
    const config = {}
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 0)
  })

  it("jskos test", async () => {
    const config = { scheme: { VOCID: "bfo" } }
    const topConcepts = await provider.getTop(config)
    assert(Array.isArray(topConcepts))
    assert(topConcepts.length === 1)
    const bfo_root_raw = fs.readFileSync("test/providers/ols-api/bfo-root.concepts.json", "utf-8")
    const bfo_root_jskos = JSON.parse(bfo_root_raw)
    Object.keys(bfo_root_jskos[0]).forEach(key => {
      assert.notDeepStrictEqual(topConcepts[0][key], undefined, `Key '${key}' is missing in topConcepts result`)
      assert.deepStrictEqual(topConcepts[0][key], bfo_root_jskos[0][key], `Value for key '${key}' does not match between topConcepts and expected JSKOS`)
    })
  })

})





describe("OlsProvider.getConcepts", () => {

  it("allConcepts long", async () => {
    this.timeout(10000);
    const config = {scheme: schemeUriDefault, limit: limitLongDefault }
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, limitLongDefault) // there are currently 6000+ concepts in ENVO
  })

  it("allConcepts short, compare scheme specifications", async () => {
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

  it("specificConcept´, compare concept specifications", async () => {
    const config = {concepts: [{ uri: conceptUriDefault, inScheme: [ schemeUriDefault ] }]}
    const configUri = {concepts: [{ uri: conceptUriDefault, inScheme: [ { uri: schemeUriDefault } ] }]}
    const configVOCID = {concepts: [{ notation: conceptNotationDefault, inScheme: [ { VOCID: schemeVOCIDDefault } ] }]}

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

})





describe("OlsProvider.getNarrower", () => {
  it("request narrower concepts of a specific concept", async () => {
    const config = { concept: { uri: conceptUriDefault, inScheme: [ schemeUriDefault ] } }
    const configUri = { concept: { uri: conceptUriDefault, inScheme: [ { uri: schemeUriDefault } ] } }
    const configVOCID = { concept: { notation: conceptNotationDefault, inScheme: [ { VOCID: schemeVOCIDDefault } ] } }

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
})

describe("OlsProvider.getAncestors", () => {
  it("request ancestors of a specific concept", async () => {
    const config = { concept: { uri: conceptUriDefault, inScheme: [ schemeUriDefault ] } }
    const configUri = { concept: { uri: conceptUriDefault, inScheme: [ { uri: schemeUriDefault } ] } }
    const configVOCID = { concept: { notation: conceptNotationDefault, inScheme: [ { VOCID: schemeVOCIDDefault } ] } }

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
})

describe("OlsProvider.search", () => {
  it("search for a term in all schemes", async () => {
    const config = { search: searchDefault }
    const concepts = await provider.search(config)
    assert(Array.isArray(concepts))
    assert(concepts.length >= 59) // there are currently 59 concepts in ENVO that match the search term "entity"
  })

  it("search for a term in a specific scheme", async () => {
    const config = { search: searchDefault, scheme: schemeUriDefault }
    const concepts = await provider.search(config)
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 1)
  })
})

describe("OlsProvider.suggest", () => {
  it("suggest for a term in all schemes", async () => {
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

  it("suggest for a term in a specific scheme", async () => {
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
