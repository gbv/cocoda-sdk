const assert = require("assert")
const cdk = require("../")

describe("index", () => {

  it("should export an empty object ", () => {
    assert.deepEqual(cdk, {})
  })

})
