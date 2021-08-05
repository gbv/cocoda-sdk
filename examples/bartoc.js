// This is all the setup that's needed!
const cdk = require("../index")
const registry = cdk.initializeRegistry({
  provider: "ConceptApi",
  status: "https://bartoc.org/api/status",
});

// Run rest of commands asynchronously
(async () => {
  console.log("Loading schemes from BARTOC API... (will take a while since we're loading ALL schemes)")
  const schemes = await registry.getSchemes({
    params: {
      uri: "http://bartoc.org/en/node/313|http://bartoc.org/en/node/18785",
    },
  })
  console.log(`Loaded ${schemes.length} schemes.`)

  for (let scheme of schemes) {
    console.log()
    console.log(`Found scheme ${scheme.notation[0]}, it was initiliazed with ${scheme._registry._jskos.provider} (${scheme._registry._jskos.api})`)
    console.log(`Loading top concepts for ${scheme.notation[0]}...`)
    const top = await scheme._getTop()
    console.log(`Loaded ${top.length} top concepts.`)
  }
})()
