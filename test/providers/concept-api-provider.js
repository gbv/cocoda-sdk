import ConceptApiProvider from "../../src/providers/concept-api-provider.js"
import assert from "assert"
import MockAdapter from "axios-mock-adapter"
import { cleanJSKOS } from "jskos-tools"

const cleanArray = r => [...r.map(cleanJSKOS)]

describe("ConceptApiProvider", () => {
  const api = {
    concepts: "test:/conceptsAPI",
    schemes: "test:/schemesAPI",
    top: "test:/topAPI",
    registries: "test:/registriesAPI",
  }

  const registry = new ConceptApiProvider(api)
  const mock = new MockAdapter(registry.axios)

  const narrower = {
    uri: "test:narrower",
    prefLabel: { en: "narrower" },
    ancestors: [{ uri: "test:concept"}],
  }
  const concept = { uri: "test:concept", narrower: [{uri: "test:narrower"}] }
  const registryValue = { uri: "test:registry" }
  const scheme = { uri: "test:scheme" }

  beforeEach(() => {
    mock.resetHandlers()
    mock.onGet(api.registries).reply(200, [registryValue])
    mock.onGet(api.schemes).reply(200, [scheme])
    mock.onGet(api.top).reply(config => {
      assert.equal(config.params.uri, scheme.uri)
      return [200, [concept]]
    })
    mock.onGet(api.concepts).reply(config => {
      const found = []
      const uris = config.params?.uri?.split("|").filter(uri => uri)
      if (!uris.length || uris.indexOf("test:concept") >= 0) {
        found.push(concept)
      }
      if (!uris.length || uris.indexOf("test:narrower") >= 0) {
        found.push(narrower)
      }
      return [200, found]
    })
  })

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
    assert.deepEqual(cleanArray(result), [concept, narrower])
  })

  it("getConcepts(all)", async () => {
    const result = await registry.getConcepts()
    assert.deepEqual(cleanArray(result), [concept, narrower])
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
