const assert = require("assert")
const cdk = require("../")
const CDK = require("../lib/CocodaSDK")

describe("index", () => {

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

})
