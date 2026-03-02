import assert from "assert"
import { cdk, addAllProviders } from "../src/index.js"
import * as providers from "../src/providers/index.js"

addAllProviders(cdk)

describe("initializeRegistry", () => {
  for (let p of Object.keys(providers).filter(p => p != "BaseProvider")) {
    it(p, () => {
      const { providerName, providerType } = providers[p]

      // old style with name
      var registry = cdk.initializeRegistry({ provider: providerName })
      assert(registry instanceof providers[p])

      // new style with type
      var registry = cdk.initializeRegistry({ api: providerType })
      assert(registry instanceof providers[p])
    })
  }
})
