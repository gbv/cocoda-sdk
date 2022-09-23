// This is all the setup that's needed!
import { cdk, addAllProviders } from "../src/index.js"
addAllProviders()
const registry = cdk.initializeRegistry({
  provider: "ConceptApi",
  api: "https://bartoc.org/api/",
});

// Run rest of commands asynchronously
(async () => {
  console.log("Loading schemes from BARTOC API... (may take a while when loading many schemes)")
  const schemes = await registry.getSchemes({
    params: {
      limit: 5000,
      // comment out to get ALL schemes
      uri: "http://bartoc.org/en/node/313|http://bartoc.org/en/node/18785|http://bartoc.org/en/node/15|http://bartoc.org/en/node/20001",
    },
  })
  console.log(`Loaded ${schemes.length} schemes.`)

  for (let scheme of schemes) {
    if (!scheme._registry || scheme._registry === registry) {
      // Fallback by default is the registry that provided the scheme (BARTOC in this case), but we don't want that.
      continue
    }
    console.log()    
    const id = scheme.notation ? scheme.notation[0] : scheme.uri
    const schemeRegistry = scheme._registry // registry by which scheme can be accessed
    console.log(`Found scheme ${id}, it was initialized with ${schemeRegistry._jskos.provider} (${schemeRegistry._jskos.api})`)
    console.log(`Loading top concepts for ${id}...`)
    try {
      const top = await scheme._getTop() // or = await schemeRegistry.getTop({scheme})
      console.log(`Loaded ${top.length} top concepts.`)
      const search = "Europ"
      const concepts = await schemeRegistry.search({scheme, search, limit: 3})
      console.log(`Sample search for ${search} resulted in:`)
      console.log(concepts.map(({uri,prefLabel}) => ({uri,prefLabel})))
    } catch (error) {
      console.error("Error loading top concepts:", error)
    }
  }
})()
