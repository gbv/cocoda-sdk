import { cdk, addAllProviders } from "../src/index.js"
addAllProviders()

const promise = cdk.loadConfig("https://coli-conc.gbv.de/cocoda/dev/cocoda.json")

export const getInstance = async () => {
  await promise
  return cdk
}
