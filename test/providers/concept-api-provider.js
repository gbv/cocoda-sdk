import ConceptApiProvider from "../../src/providers/concept-api-provider.js"
import assert from "assert"
import { cleanJSKOS } from "jskos-tools"
import { mockHttpRequests } from "./mocks/http-requests.js"
import fs from "fs"

const cleanArray = r => [...r.map(cleanJSKOS)]

const concepts = JSON.parse(fs.readFileSync("test/providers/mocks/concept-api-provider/concepts.json", "utf-8"))
const [concept] = JSON.parse(fs.readFileSync("test/providers/mocks/concept-api-provider/concept.json", "utf-8"))
const [narrower] = JSON.parse(fs.readFileSync("test/providers/mocks/concept-api-provider/narrower.json", "utf-8"))
const [registryValue] = JSON.parse(fs.readFileSync("test/providers/mocks/concept-api-provider/registry.json", "utf-8"))
const [scheme] = JSON.parse(fs.readFileSync("test/providers/mocks/concept-api-provider/scheme.json", "utf-8"))

const api = {
  concepts: "test:/conceptsAPI",
  schemes: "test:/schemesAPI",
  top: "test:/topAPI",
  registries: "test:/registriesAPI",
}
const registry = new ConceptApiProvider(api)

const missing = mockHttpRequests(registry.http, {
  dir: "test/providers/mocks/concept-api-provider/",
  // debug: true,
  downloadMissing: false,
}, {
  "test:/registriesAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=500&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "registry.json",
  "test:/schemesAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=500&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "scheme.json",
  "test:/schemesAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=500&uri=test%3Ascheme&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "scheme.json",
  "test:/topAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=10000&uri=test%3Ascheme&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concept.json",
  "test:/conceptsAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=100&uri=test%3Aconcept&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concept.json",
  "test:/conceptsAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=100&uri=test%3Aconcept%7Ctest%3Anarrower&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concepts.json",
  "test:/conceptsAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=100&uri=test%3Anarrower&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "narrower.json",
  "test:/conceptsAPI?properties=%2Bcreated%2Cissued%2Cmodified%2CeditorialNote%2CscopeNote%2Cnote%2Cdefinition%2Cmappings%2Clocation&limit=100&uri=&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concepts.json",
  "test:/conceptsAPI?properties=narrower&limit=100&uri=test%3Aconcept&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "concept.json",
  "test:/conceptsAPI?properties=ancestors&limit=100&uri=test%3Anarrower&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp": "narrower.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: '${url}'`)))

describe("ConceptApiProvider", () => {

  it ("getRegistries", async () => {
    const result = await registry.getRegistries()
    assert.deepEqual(cleanArray(result), [registryValue])
  })

  it("getSchemes", async () => {
    const result = await registry.getSchemes()
    assert.deepEqual(cleanArray(result), [scheme])
  })

  it("getTop", async () => {
    const result = await registry.getTop({ scheme })
    assert.deepEqual(cleanArray(result), [concept])
  })

  it("getConcepts(one)", async () => {
    const result = await registry.getConcepts({ concepts: [{ uri: "test:concept" }] })
    assert.deepEqual(cleanArray(result), [concept])
  })

  it("getConcepts(multiple)", async () => {
    const result = await registry.getConcepts({ concepts: [
      { uri: "test:concept" }, { uri: "test:narrower" }] })
    assert.deepEqual(cleanArray(result), concepts)
  })

  it("getConcepts(all)", async () => {
    const result = await registry.getConcepts()
    assert.deepEqual(cleanArray(result), concepts)
  })

  it("getNarrower(fallback to getConcepts)", async () => {
    const result = await registry.getNarrower({ concept })
    assert.deepEqual(cleanArray(result), [narrower])
  })

  it("getAncestors(fallback to getConcepts)", async () => {
    const result = await registry.getAncestors({ concept: narrower })
    assert.deepEqual(cleanArray(result), [concept])
  })
})
