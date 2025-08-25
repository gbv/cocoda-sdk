import { cdk, addAllProviders } from "../src/index.js"
import * as jskos from "jskos-tools"

addAllProviders()
const registry = cdk.initializeRegistry({
  provider: "ModApi",
  // api: "https://bartoc.org/api/",
  uri: "https://terminology.services.base4nfdi.de/api-gateway", // "http://localhost:8080/api-gateway" if api-gateway is running locally
  language: "und",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
  transformation: "manual", // "jsonld" for conversion via jsonld-concept or "manual" for manual conversion
})

console.log("hui");

// Run rest of commands asynchronously
(async () => {
  console.log("Loading schemes from ... API... (may take a while when loading many schemes)")
  const schemes = await registry.getSchemes({
    params: {
      limit: 5,
    // comment out to get ALL schemes
    //#uri: "http://bartoc.org/en/node/313|http://bartoc.org/en/node/18785|http://bartoc.org/en/node/15|http://bartoc.org/en/node/20001",
    },
  })
  console.log(`Loaded ${schemes.length} schemes.`)

  for (let scheme of schemes) {
    console.log(jskos.clean(scheme))
  }

})()

