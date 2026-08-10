import ModApiProvider from "../../src/providers/mod-api-provider.js"
import assert from "assert"
import { mockHttpRequests } from "./mocks/http-requests.js"

const provider = new ModApiProvider({
  endpoint: "https://terminology.services.base4nfdi.de/api-gateway/",
  language: "en",
  cleancontext: true,
})

const missing = mockHttpRequests(provider.http, {
  dir: "test/providers/mocks/mod-api-provider/",
  // debug: true,
  downloadMissing: true,
}, {
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "schemes.json",
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts/gndo?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "scheme-gndo.json",
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts/gndo/resources/concepts?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concepts-gndo.json",
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts/gnd/resources/concepts/4179484-9?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concept-4179484-9.json",
  "https://terminology.services.base4nfdi.de/api-gateway/collections/?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "collections.json",

  "https://terminology.services.base4nfdi.de/api-gateway/artefacts": "schemes.json",
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts/gndo": "scheme-gndo.json",
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts/gndo/resources/concepts": "concepts-gndo.json",
  "https://terminology.services.base4nfdi.de/api-gateway/artefacts/gnd/resources/concepts/4179484-9": "concept-4179484-9.json",
  "https://terminology.services.base4nfdi.de/api-gateway/collections/": "collections.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

// default values
const limitDefault = 5
const specificSchemeDefault = "gndo"
const specificSchemeDefault2 = "gnd"
const schemeUriDefault = "http://d-nb.info/standards/elementset/gnd#"
const schemeUriDefault2 = "https://lobid.org/gnd"
const conceptUriDefault = "https://d-nb.info/gnd/4179484-9"
const conceptNotationDefault = "4179484-9"

describe("ModApiProvider.getRegistries", () => {

  it("allRegistries", async () => {
    const registries = await provider.getRegistries()
    assert(Array.isArray(registries))
    assert.ok(registries.length > 5)
  })

  it("allRegistriesLimit", async () => {
    const registries = await provider.getRegistries({ limit: limitDefault })
    assert(Array.isArray(registries))
    assert.equal(registries.length, limitDefault)
  })

  it("allRegistriesSpecific", async () => {
    const registries = await provider.getRegistries({ limit: limitDefault })
    assert(Array.isArray(registries))
    assert.equal(registries.length, limitDefault)
  })
})


describe("ModApiProvider.getSchemes", () => {

  it("allSchemes", async () => {
    const schemes = await provider.getSchemes()
    assert(Array.isArray(schemes))
    assert.ok(schemes.length > 5)
  })

  it("allSchemesLimit", async () => {
    const schemes = await provider.getSchemes({ limit: limitDefault })
    assert(Array.isArray(schemes))
    assert.equal(schemes.length, limitDefault)
  })

  it("allSchemesUri", async () => {
    const schemes = await provider.getSchemes({ schemes: [ { uri: schemeUriDefault } ] })
    assert(Array.isArray(schemes))
    assert.equal(schemes.length, 1)
    assert.equal(schemes[0].uri, schemeUriDefault)
  })
  
  it("allSchemesShort", async () => {
    const schemes = await provider.getSchemes({ schemes: [ {short: specificSchemeDefault} ] })
    assert(Array.isArray(schemes))
    assert.equal(schemes.length, 1)
    assert(schemes[0].notation.includes(specificSchemeDefault))
  })
})

describe("ModApiProvider.getConcepts", () => {

  it("topConceptsViaUri", async () => {
    const config = {scheme: { uri: schemeUriDefault }, limit: 10 }
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 10)
  })

  it("topConceptsViaShortForm", async () => {
    const config = {scheme: { short: specificSchemeDefault }, limit: 10 }
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 10)
  })

  it("allConceptsViaUri", async () => {
    const config = {scheme: { uri: schemeUriDefault }}
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.ok(concepts.length > 0)
  })

  it("allConceptsViaShortForm", async () => {
    const config = {scheme: { short: specificSchemeDefault } }
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.ok(concepts.length > 0)
  })

  it("specificConceptViaShortFormAndNotation", async () => {
    const config = {concepts: [{ notation: conceptNotationDefault, inScheme: [ { short: specificSchemeDefault2 } ] }]}
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.ok(concepts.length > 0)
    assert(concepts[0].notation.includes(conceptNotationDefault))
  })

  it("specificConceptsViaUris", async () => {
    const config = {concepts: [{ uri: conceptUriDefault, inScheme: [ { uri: schemeUriDefault2 } ] }]}
    const concepts = await provider.getConcepts(config)
    assert(Array.isArray(concepts))
    assert.equal(concepts.length, 1)
    assert.equal(concepts[0].uri, conceptUriDefault)
  })
})

