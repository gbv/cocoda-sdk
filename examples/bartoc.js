// This is all the setup that's needed!
const cdk = require("../index")
const registry = cdk.initializeRegistry({
  provider: "ConceptApi",
  status: "https://bartoc.org/api/status",
});

// Run rest of commands asynchronously
(async () => {
  console.log("Loading schemes from BARTOC API... (may take a while when loading many schemes)")
  const schemes = await registry.getSchemes({
    params: {
      limit: 5000,
      // comment out to get ALL schemes
      uri: "http://bartoc.org/en/node/313|http://bartoc.org/en/node/18785|http://bartoc.org/en/node/15",
    },
  })
  console.log(`Loaded ${schemes.length} schemes.`)

  for (let scheme of schemes) {
    console.log()
    const id = scheme.notation ? scheme.notation[0] : scheme.uri
    console.log(`Found scheme ${id}, it was initialized with ${scheme._registry._jskos.provider} (${scheme._registry._jskos.api})`)
    console.log(`Loading top concepts for ${id}...`)
    const top = await scheme._getTop()
    console.log(`Loaded ${top.length} top concepts.`)
  }
})()