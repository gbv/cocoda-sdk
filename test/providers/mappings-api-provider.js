const MappingsApiProvider = require("../../providers/mappings-api-provider")
const assert = require("assert")
const MockAdapter = require("axios-mock-adapter")
const errors = require("../../errors")
const jskos = require("jskos-tools")

const api = {
  mappings: "test:/mappings",
  concordances: "test:/concordances",
  annotations: "test:/annotations",
  status: "test:/status",
}

const registry = new MappingsApiProvider({
  status: api.status,
})
const mock = new MockAdapter(registry.axios)

describe("MappingsApiProvider", () => {

  beforeEach(() => {
    mock.resetHandlers()
  })

  it("should init the registry correctly via /status", async () => {
    mock.onGet(api.status).reply(200, api)
    await registry.init()
    Object.keys(api).forEach(key => {
      assert.equal(registry._api[key], api[key])
    })
  })

  it("should perform requesting mappings correctly", (done) => {
    const requestConfig = {
      from: "testFrom",
      fromScheme: "testFromScheme",
      to: { uri: "testTo" },
      toScheme: { uri: "testToScheme" },
      // TODO: Add more parameters
    }
    mock.onGet().reply(config => {
      assert.equal(config.url, api.mappings)
      assert.equal(config.params.from, requestConfig.from)
      assert.equal(config.params.fromScheme, requestConfig.fromScheme)
      assert.equal(config.params.to, requestConfig.to.uri)
      assert.equal(config.params.toScheme, requestConfig.toScheme.uri)

      done()
      return [200, []]
    })
    registry.getMappings(requestConfig)
  })

  it("should perform requesting a single mapping correctly", (done) => {
    const mapping = {
      uri: `${api.mappings}/123`,
    }
    // Simply test whether the correct URL is called
    mock.onGet().reply(config => {
      assert.equal(config.url, mapping.uri)

      done()
      return [200, {}]
    })
    registry.getMapping({ mapping })
  })

  it("should throw an error when calling getMapping without mapping", async () => {
    let wasError = false
    try {
      await registry.getMapping()
    } catch(error) {
      wasError = true
      assert(error instanceof errors.InvalidOrMissingParameterError)
    }
    assert(wasError)
  })

  it("should throw an error when calling getMapping without mapping URI", async () => {
    let wasError = false
    try {
      await registry.getMapping({ mapping: {} })
    } catch(error) {
      wasError = true
      assert(error instanceof errors.InvalidOrMissingParameterError)
    }
    assert(wasError)
  })

  it("should perform posting a mapping correctly", (done) => {
    const mappingToPost = {}
    const mapping = jskos.addMappingIdentifiers(mappingToPost)
    mock.onPost().reply(config => {
      assert.equal(config.url, api.mappings)
      assert.deepEqual(JSON.parse(config.data), mapping)

      done()
      return [200, {}]
    })
    registry.postMapping({ mapping })
  })

  it("should throw an error when calling postMapping without mapping", async () => {
    let wasError = false
    try {
      await registry.postMapping()
    } catch(error) {
      wasError = true
      assert(error instanceof errors.InvalidOrMissingParameterError)
    }
    assert(wasError)
  })

  /***
   * TODO: Implement more test.
   *
   * These tests should assert whether the axios request is performed as expected.
   * See also existing tests.
   */

})
