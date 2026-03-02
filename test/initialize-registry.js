import assert from "assert"
import { cdk, addAllProviders } from "../src/index.js"
import * as providers from "../src/providers/index.js"

addAllProviders(cdk)

const exclude = new Set([
  "BaseProvider",
  "LocalMappingsProvider",
  "OccurrencesApiProvider",
  "MappingsApiProvider",
  "LabelSearchSuggestionProvider",
])

describe("initializeRegistry", () => {
  for (let p of Object.keys(providers).filter(p => !exclude.has(p))) {
    it(p, () => {
      const { providerName, providerType } = providers[p]

      // old style with name
      let registry = cdk.initializeRegistry({ provider: providerName })
      assert(registry instanceof providers[p])

      // new style with type
      registry = cdk.initializeRegistry({ api: providerType })
      assert(registry instanceof providers[p])
    })
  }
})
