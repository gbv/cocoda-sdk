import BaseProvider from "../../src/providers/base-provider.js"
import assert from "assert"
import MockAdapter from "axios-mock-adapter"
import * as utils from "../../src/utils/index.js"

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
    assert.doesNotThrow(() => {
      provider = getProvider() 
    })
  })

  it("should have certain properties", () => {
    provider = getProvider(registry)
    assert.equal(provider._jskos, registry, "registry property does not refer to registry object")
    assert.deepEqual(provider.languages, [], "languages property is not an empty array")
    assert.deepEqual(provider._auth, { key: null, bearerToken: null })
    assert.notEqual(provider.axios && provider.axios.request, undefined)
  })

  it("should have all request methods", async () => {
    for (let { method } of utils.requestMethods) {
      assert.ok(!!provider[method], `could not find method ${method}`)
      // All request methods should throw by default
      await assert.rejects(async () => {
        await provider[method]() 
      }, `method ${method} does not throw by default`)
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
    assert.equal(scheme._registry, provider)
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
    assert.equal(concept._registry, provider)
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
    assert.equal(mapping._registry, provider)
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
    assert.equal(concordance._registry, provider)
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
    provider._jskos.excludedSchemes = [excludedScheme]
    assert.ok(!provider.supportsScheme(excludedScheme))
    // schemes
    const scheme = { uri: "test:scheme" }
    provider._jskos.schemes = [scheme]
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

  it("should retry axios requests", async () => {
    provider.setRetryConfig({
      delay: 5,
    })
    let requestCount = 0
    mock.onGet("test").reply(() => {
      requestCount += 1
      return [requestCount == 1 ? 403 : 200]
    })
    await assert.doesNotReject(async () => {
      await provider.axios({
        method: "get",
        url: "test",
      })
    })
    assert(requestCount, 2)
  })

  it("should not retry axios requests indefinitely", async () => {
    provider.setRetryConfig({
      delay: 5,
    })
    let requestCount = 0
    mock.onGet("test").reply(() => {
      requestCount += 1
      return [401]
    })
    await assert.rejects(async () => {
      await provider.axios({
        method: "get",
        url: "test",
      })
    })
    assert(requestCount, 3)
  })

  it("should not retry axios requests at all if count is set to 0", async () => {
    provider.setRetryConfig({
      count: 0,
    })
    let requestCount = 0
    mock.onGet("test").reply(() => {
      requestCount += 1
      return [401]
    })
    await assert.rejects(async () => {
      await provider.axios({
        method: "get",
        url: "test",
      })
    })
    assert(requestCount, 1)
  })

  it("should not retry axios requests for POST requests", async () => {
    provider.setRetryConfig({
      count: 3,
    })
    let requestCount = 0
    mock.onPost("test").reply(() => {
      requestCount += 1
      return [401]
    })
    await assert.rejects(async () => {
      await provider.axios({
        method: "post",
        url: "test",
      })
    })
    assert(requestCount, 1)
  })

  it("should not repeat the same axios request is one is already there", async () => {
    class CustomProvider extends BaseProvider {
      async getMappings() {
        return this.axios({
          method: "get",
          url: "mappings",
        })
      }
    }
    const provider = new CustomProvider({})
    const mock = new MockAdapter(provider.axios)
    let mockCalled = 0
    mock.onGet("mappings").reply(() => {
      mockCalled += 1
      return [200, []]
    })
    const promise1 = provider.getMappings()
    const promise2 = provider.getMappings()
    assert.equal(promise1, promise2)
    await promise1
    await promise2
    assert.equal(mockCalled, 1, "axios request was performed twice even though it shouldn't")
    // Now that the request is finished, do it again to make sure it made a new axios request
    await provider.getMappings()
    assert.equal(mockCalled, 2, "expected axios to perform a new request after other requests are finished")
  })

  it("should properly handle `stored` property", () => {
    let provider

    provider = new BaseProvider()
    assert.equal(provider.stored, undefined)

    BaseProvider.stored = true
    provider = new BaseProvider()
    assert.equal(provider.stored, true)

    provider = new BaseProvider({ stored: false })
    assert.equal(provider.stored, false)
  })

})
