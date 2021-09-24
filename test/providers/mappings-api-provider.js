import MappingsApiProvider from "../../src/providers/mappings-api-provider.js"
import assert from "assert"
import MockAdapter from "axios-mock-adapter"
import * as errors from "../../src/errors/index.js"
import jskos from "jskos-tools"

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

  it("should perform posting multiple mappings correctly", (done) => {
    const mappings = [
      {
        uri: "test:/mappings/1",
      },
      {
        uri: "test:/mappings/2",
      },
    ].map(mapping => jskos.addMappingIdentifiers(mapping))

    const postedIndexes = []
    mock.onPost().reply(config => {
      assert.equal(config.url, api.mappings)
      const index = mappings.findIndex(mapping => mapping.uri === JSON.parse(config.data).uri)
      assert.ok(index !== -1 && !postedIndexes.includes(index))
      postedIndexes.push(index)
      if (postedIndexes.length === mappings.length) {
        done()
      }

      return [200, {}]
    })
    registry.postMappings({ mappings })
  })

  it("should perform deleting a mapping correctly", (done) => {
    const mapping = {
      uri: "test:/mappings/1",
    }
    mock.onDelete().reply(config => {
      assert.equal(config.url, mapping.uri)
      done()
      return [204]
    })
    registry.deleteMapping({ mapping }).catch(error => {
      console.log(error)
    })
  })

  it("should perform deleting multiple mappings correctly", (done) => {
    const mappings = [
      {
        uri: "test:/mappings/1",
      },
      {
        uri: "test:/mappings/2",
      },
    ]

    const deletedIndexes = []
    mock.onDelete().reply(config => {
      const index = mappings.findIndex(mapping => mapping.uri === config.url)
      assert.ok(index !== -1 && !deletedIndexes.includes(index))
      deletedIndexes.push(index)
      if (deletedIndexes.length === mappings.length) {
        done()
      }
      return [204]
    })
    registry.deleteMappings({ mappings })
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
