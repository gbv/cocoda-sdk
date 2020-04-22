const assert = require("assert")
const cdk = require("../")
const utils = require("../utils")

describe("index", () => {

  it("should export the default instance that can also be called as a function", () => {
    assert.equal(typeof cdk, "function", "cdk should be a function")
    assert.equal(cdk instanceof Object, true, "cdk should be instance of Object")
  })

  it("should have expected properties", () => {
    const props = [
      "config",
      "createInstance",
    ].concat(utils.requestMethods)
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
