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

})
