const assert = require("assert")
const cdk = require("../")
const CDK = require("../lib/CocodaSDK")

// Import BaseProvider for subclassing
const BaseProvider = require("../providers/base-provider")

// axios mock
const MockAdapter = require("axios-mock-adapter")
const mock = new MockAdapter(cdk.axios)

describe("index", () => {

  beforeEach(() => {
    mock.resetHandlers()
  })

  it("should export the default instance", () => {
    assert.equal(cdk instanceof CDK, true, "cdk should be instance of CocodaSDK")
  })

  it("should set config when setConfig is called", () => {
    cdk.setConfig({ test: "test" })
    assert.equal(cdk.config.test, "test")
  })

  it("should have expected properties", () => {
    const props = [
      "config",
      "createInstance",
      "loadConfig",
      "setConfig",
      "loadBuildInfo",
      "getRegistryForUri",
      "initializeRegistry",
      "addProvider",
    ]
    for (let prop of props) {
      assert.ok(!!cdk[prop], `cdk should have property "${prop}"`)
    }
  })

  it("should be able to create a new instance with createInstance", () => {
    // Set custom property on current instance
    cdk.someProp = "test"
    // Create a new instance
    const cdk2 = cdk.createInstance()
    // Check that custom prop doesn't exist on new instance
    assert.ok(!cdk2.someProp)
  })

  it("should properly repeat a method", (done) => {
    let callbackCalled = 0
    let valueToBeIncremented = 0
    let method = () => {
      return ++valueToBeIncremented
    }
    let cancel
    cancel = cdk.repeat({
      function: method,
      interval: 10,
      callback: (error, result, previousResult) => {
        assert(previousResult == null || result == previousResult + 1)
        assert.equal(result, valueToBeIncremented)
        callbackCalled += 1
        // Stop test after three calls
        if (callbackCalled == 3) {
          cancel()
          done()
        }
      },
    })
  })

  it("should properly behave when loading buildInfo without previous value", (done) => {
    let mockCalled = 0
    mock.onGet("buildInfo").reply(() => {
      mockCalled += 1
      return [200, { mockCalled }]
    })
    let cancel
    cancel = cdk.loadBuildInfo({
      url: "buildInfo",
      interval: 10,
      callback: (error, buildInfo, previousBuildInfo) => {
        assert(!error)
        assert.notEqual(previousBuildInfo, null)
        assert.equal(buildInfo.mockCalled, mockCalled)
        cancel()
        done()
      },
    })
  })

  it("should properly behave when loading buildInfo with previous value", (done) => {
    let mockCalled = 0
    mock.onGet("buildInfo").reply(() => {
      mockCalled += 1
      return [200, { mockCalled }]
    })
    let cancel
    cancel = cdk.loadBuildInfo({
      url: "buildInfo",
      buildInfo: {
        mockCalled,
      },
      interval: 10,
      callback: (error, buildInfo, previousBuildInfo) => {
        assert(!error)
        if (mockCalled == 1) {
          assert.notEqual(previousBuildInfo, null)
          assert.equal(previousBuildInfo.mockCalled, 0)
          assert.equal(buildInfo.mockCalled, 1)
        } else if (mockCalled == 2) {
          assert.notEqual(previousBuildInfo, null)
          assert.equal(previousBuildInfo.mockCalled, 1)
          assert.equal(buildInfo.mockCalled, 2)
          cancel()
          done()
        }
      },
    })
  })

  it("should properly behave when loading buildInfo with an error", (done) => {
    let mockCalled = 0
    mock.onGet("buildInfo").reply(() => {
      mockCalled += 1
      return [mockCalled == 1 ? 404 : 200, { mockCalled }]
    })
    let cancel
    cancel = cdk.loadBuildInfo({
      url: "buildInfo",
      interval: 10,
      callback: (error, result) => {
        if (mockCalled == 1) {
          assert.notEqual(error, null)
        } else if (mockCalled == 2) {
          // Should not call callback here!
          assert(false)
        } else if (mockCalled == 3) {
          assert.equal(result.mockCalled, mockCalled)
          cancel()
          done()
        }
      },
    })
  })

  it("should load schemes properly", async () => {
    const scheme1 = {
      uri: "scheme1",
    }
    const scheme2 = {
      uri: "scheme2",
    }
    const scheme1alt = {
      uri: "scheme1",
      test: 1,
    }
    class SchemeProvider1 extends BaseProvider {
      constructor(registry) {
        super(registry)
        this.has.schemes = true
      }
      async getSchemes() {
        return [scheme1, scheme2]
      }
    }
    SchemeProvider1.providerName = "Scheme1"
    class SchemeProvider2 extends BaseProvider {
      constructor(registry) {
        super(registry)
        this.has.schemes = true
      }
      async getSchemes() {
        return [scheme1alt]
      }
    }
    SchemeProvider2.providerName = "Scheme2"
    const cdk2 = cdk.createInstance()
    cdk2.addProvider(SchemeProvider1)
    cdk2.addProvider(SchemeProvider2)
    cdk2.setConfig({
      registries: [
        {
          provider: SchemeProvider2.providerName,
        },
        {
          provider: SchemeProvider1.providerName,
        },
      ],
    })
    const schemes = await cdk2.getSchemes()
    assert.equal(schemes.length, 2)
    schemes.forEach(scheme => {
      if (scheme.uri == "scheme1") {
        // Expect scheme1 to be from SchemeProvider2
        assert(scheme._registry instanceof SchemeProvider2)
      }
      if (scheme.uri == "scheme2") {
        // Expect scheme2 to be from SchemeProvider1
        assert(scheme._registry instanceof SchemeProvider1)
      }
    })
  })

})
