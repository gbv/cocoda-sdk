import { cdk, BaseProvider } from "../src/index.js"

// Custom provider that only returns one concept
class CustomProvider extends BaseProvider {
  static providerName = "Dummy"

  getConcepts() {
    return [
      { prefLabel: { en: "Hello!" } },
    ]
  }
}

(async () => {
  cdk.addProvider(CustomProvider)
  const registry = cdk.initializeRegistry({ provider: "Dummy" })
  await registry.init()

  const concepts = await registry.getConcepts()
  console.log(concepts._totalCount)
})()
