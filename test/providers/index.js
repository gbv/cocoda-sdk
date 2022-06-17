import assert from "assert"
import { cdk } from "../../src/index.js"
const providers = cdk.providers

describe("providers", () => {

  it("should have an addProvider method", () => {
    assert.ok(typeof providers.addProvider == "function", "expected method addProvider to exist")
  })

  it("should have all the default providers", () => {
    const defaultProviderNames = [
      "Base",
      "ConceptApi",
      "MappingsApi",
    ]
    for (let name of defaultProviderNames) {
      assert.ok(!!providers[name], `expected provider ${name} to exist`)
    }
  })

  it("should not allow adding a provider that doesn't inherit from BaseProvider", () => {
    class Test {}
    assert.throws(() => {
      providers.addProvider(Test)
    })
  })

  it("should allow adding a provider that inherits from BaseProvider", () => {
    class TestProvider extends providers.Base {}
    TestProvider.providerName = "Test"
    assert.doesNotThrow(() => {
      providers.addProvider(TestProvider)
      assert(!!providers.Test)
    })
  })

})
