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
      uri: "http://bartoc.org/en/node/430",
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
      const concepts2 = await schemeRegistry.getConcepts({ concepts: [{ uri: "https://d-nb.info/gnd/4026894-9" }] })
      console.log("Concept data for 4026894-9 Informatik")
      console.log(JSON.stringify(concepts2.map(({uri, prefLabel, altLabel, mappings}) => ({uri, prefLabel, altLabel, mappings}))[0], null, 2))
    } catch (error) {
      console.error("Error loading top concepts:", error)
    }
  }
})()
