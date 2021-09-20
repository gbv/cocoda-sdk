import { cdk } from "../src/index.js"
import * as providers from "../src/providers/index.js"

// We need to add all providers here
for (const provider of Object.values(providers)) {
  cdk.addProvider(provider)
}

const promise = cdk.loadConfig("https://coli-conc.gbv.de/cocoda/dev/cocoda.json")

export const getInstance = async () => {
  await promise
  return cdk
}
