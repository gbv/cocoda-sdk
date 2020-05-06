const BaseProvider = require("../../providers").Base
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
    delete result._url
    assert.deepEqual(result, {})

    mock.onGet("test").reply(200, [], { "x-total-count": 5 })
    result = await provider.axios({
      method: "get",
      url: "test",
    })
    assert.ok(Array.isArray(result))
    assert.ok(result._url && result._url.startsWith("test"))
    assert.equal(result._totalCount, 5)
  })

  it("should adjust schemes as expected", () => {
    const schemes = [{}]
    schemes._totalCount = 1
    schemes._url = "test-url"
    const adjustedSchemes = provider.adjustSchemes(schemes)
    assert.equal(adjustedSchemes._totalCount, schemes._totalCount)
    assert.equal(adjustedSchemes._url, schemes._url)
    const [scheme] = adjustedSchemes
    assert.equal(scheme._provider, provider)
    assert.ok(typeof scheme._getTop == "function")
    assert.ok(typeof scheme._suggest == "function")
    assert.ok(typeof scheme._getTypes == "function")
  })

  it("should adjust concepts as expected", () => {
    const concepts = [{}]
    concepts._totalCount = 1
    concepts._url = "test-url"
    const adjustedConcepts = provider.adjustConcepts(concepts)
    assert.equal(adjustedConcepts._totalCount, concepts._totalCount)
    assert.equal(adjustedConcepts._url, concepts._url)
    const [concept] = adjustedConcepts
    assert.equal(concept._provider, provider)
    assert.ok(typeof concept._getNarrower == "function")
    assert.ok(typeof concept._getAncestors == "function")
    assert.ok(typeof concept._getDetails == "function")
  })

  it("should adjust mappings as expected", () => {
    const mappings = [{}]
    mappings._totalCount = 1
    mappings._url = "test-url"
    const adjustedMappings = provider.adjustMappings(mappings)
    assert.equal(adjustedMappings._totalCount, mappings._totalCount)
    assert.equal(adjustedMappings._url, mappings._url)
    const [mapping] = adjustedMappings
    assert.equal(mapping._provider, provider)
    assert.ok(Array.isArray(mapping.identifier))
    assert.equal(mapping.fromScheme, null)
    assert.equal(mapping.toScheme, null)
  })

  it("should adjust concordances as expected", () => {
    const concordances = [{}]
    concordances._totalCount = 1
    concordances._url = "test-url"
    const adjustedConcordances = provider.adjustConcordances(concordances)
    assert.equal(adjustedConcordances._totalCount, concordances._totalCount)
    assert.equal(adjustedConcordances._url, concordances._url)
    const [concordance] = adjustedConcordances
    assert.equal(concordance._provider, provider)
  })

  it("should adjust registries as expected", () => {
    const registries = [{}]
    const adjustedRegistries = provider.adjustConcordances(registries)
    // Currently no adjustments to registries
    assert.equal(adjustedRegistries, registries)
  })

  it("supportsScheme", () => {
    // By default, any scheme should be supported if neither `schemes` nor `excludedSchemes` is set on registry
    assert.ok(provider.supportsScheme({}))
    // excludedSchemes
    const excludedScheme = { uri: "test:excluded" }
    provider.registry.excludedSchemes = [excludedScheme]
    assert.ok(!provider.supportsScheme(excludedScheme))
    // schemes
    const scheme = { uri: "test:scheme" }
    provider.registry.schemes = [scheme]
    // if `schemes` is set, any scheme shouldn't be supported anymore
    assert.ok(!provider.supportsScheme({}))
    // excluded schemes shouldn't be supported
    assert.ok(!provider.supportsScheme(excludedScheme))
    // only scheme in `schemes` should be supported
    assert.ok(provider.supportsScheme(scheme))
  })

  // TODO
  // it("isAuthorizedFor", () => {

  // })

})
