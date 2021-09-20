import { cdk, BaseProvider } from "../src/index.js"

// Custom provider that only returns one empty mapping
class CustomProvider extends BaseProvider {

  _setup() {
    this.has.mappings = true
  }

  getMappings() {
    return [
      {},
    ]
  }
}
CustomProvider.providerName = "Custom";

(async () => {
  cdk.addProvider(CustomProvider)
  const registry = cdk.initializeRegistry({
    provider: "Custom",
  })
  await registry.init()

  const mappings = await registry.getMappings()
  console.log(mappings._totalCount)

})()
