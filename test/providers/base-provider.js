const BaseProvider = require("../../providers/base-provider")
const assert = require("assert")
const MockAdapter = require("axios-mock-adapter")
const utils = require("../../utils")

describe("BaseProvider", () => {
  let provider, registry = {}, mock
  const getProvider = (...args) => {
    const provider = new BaseProvider(...args)
    mock = new MockAdapter(provider.axios)
    return provider
  }

  beforeEach(() => {
    mock && mock.resetHandlers()
  })

  it("should initialize without parameters", () => {
    assert.doesNotThrow(() => { provider = getProvider() })
  })

  it("should have certain properties", () => {
    provider = getProvider({ registry })
    assert.equal(provider.registry, registry, "registry property does not refer to registry object")
    assert.deepEqual(provider.has, {}, "has property is not empty")
    assert.deepEqual(provider.languages, [], "languages property is not an empty array")
    assert.deepEqual(provider.auth, { key: null, bearerToken: null })
    assert.notEqual(provider.axios && provider.axios.request, undefined)
  })

  it("should have all request methods", async () => {
    for (let { method } of utils.requestMethods) {
      assert.ok(!!provider[method], `could not find method ${method}`)
      // All request methods should throw by default
      await assert.rejects(async () => { await provider[method]() }, `method ${method} does not throw by default`)
    }
  })

  it("should set certain parameters and headers on axios request", async () => {
    mock.onGet("test").reply(config => {
      const languages = (config.params.language || "").split(",")
      assert.equal(languages[0], "def")
      assert.equal(languages[1], "abc")
      assert.equal(config.headers.Authorization, "Bearer abcdef")

      return [200, {}]
    })
    provider.languages = ["abc"]
    provider.setAuth({ key: "blubb", bearerToken: "abcdef" })
    provider.has.auth = true
    await provider.axios({
      method: "get",
      url: "test",
      params: {
        language: "def",
      },
    })
  })

  it("should perform certain actions on response", async () => {
    let result

    mock.onGet("test").reply(200, {})
    result = await provider.axios({
      method: "get",
      url: "test",
    })
    assert.deepEqual(result, {})

    mock.onGet("test").reply(200, [], { "x-total-count": 5 })
    result = await provider.axios({
      method: "get",
      url: "test",
    })
    assert.ok(Array.isArray(result))
    assert.ok(result.url && result.url.startsWith("test"))
    assert.equal(result.totalCount, 5)
  })

  it("should adjust schemes as expected", () => {
    const schemes = [{}]
    schemes.totalCount = 1
    schemes.url = "test-url"
    const adjustedSchemes = provider.adjustSchemes(schemes)
    assert.equal(adjustedSchemes.totalCount, schemes.totalCount)
    assert.equal(adjustedSchemes.url, schemes.url)
    const [scheme] = adjustedSchemes
    assert.equal(scheme._provider, provider)
    assert.ok(typeof scheme._getTop == "function")
    assert.ok(typeof scheme._suggest == "function")
    assert.ok(typeof scheme._getTypes == "function")
  })

  it("should adjust concepts as expected", () => {
    const concepts = [{}]
    concepts.totalCount = 1
    concepts.url = "test-url"
    const adjustedConcepts = provider.adjustConcepts(concepts)
    assert.equal(adjustedConcepts.totalCount, concepts.totalCount)
    assert.equal(adjustedConcepts.url, concepts.url)
    const [concept] = adjustedConcepts
    assert.equal(concept._provider, provider)
    assert.ok(typeof concept._getNarrower == "function")
    assert.ok(typeof concept._getAncestors == "function")
    assert.ok(typeof concept._getDetails == "function")
  })

  it("should adjust mappings as expected", () => {
    const mappings = [{}]
    mappings.totalCount = 1
    mappings.url = "test-url"
    const adjustedMappings = provider.adjustMappings(mappings)
    assert.equal(adjustedMappings.totalCount, mappings.totalCount)
    assert.equal(adjustedMappings.url, mappings.url)
    const [mapping] = adjustedMappings
    assert.equal(mapping._provider, provider)
    assert.ok(Array.isArray(mapping.identifier))
    assert.equal(mapping.fromScheme, null)
    assert.equal(mapping.toScheme, null)
  })

  it("should adjust concordances as expected", () => {
    const concordances = [{}]
    concordances.totalCount = 1
    concordances.url = "test-url"
    const adjustedConcordances = provider.adjustConcordances(concordances)
    assert.equal(adjustedConcordances.totalCount, concordances.totalCount)
    assert.equal(adjustedConcordances.url, concordances.url)
    const [concordance] = adjustedConcordances
    assert.equal(concordance._provider, provider)
  })

  it("should adjust registries as expected", () => {
    const registries = [{}]
    const adjustedRegistries = provider.adjustConcordances(registries)
    // Currently no adjustments to registries
    assert.equal(adjustedRegistries, registries)
  })

})
