import { cdk, addAllProviders } from "../src/index.js"
import * as jskos from "jskos-tools"
import readline from "node:readline"
import { stdin as input, stdout as output } from "node:process"

// Provider
addAllProviders()
const provider = cdk.initializeRegistry({
  provider: "OlsApi",
  uri: "https://api.terminology.tib.eu/api/", // or "http://service.tib.eu/ts4tib/api", "http://www.ebi.ac.uk/ols/api", "https://www.ebi.ac.uk/ols4/api"
  language: "en",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})


// default values
const limitDefault = 20
const specificSchemeDefault = "envo"
const schemeUriDefault = "http://purl.obolibrary.org/obo/envo.owl"
const conceptUriDefault = "http://purl.obolibrary.org/obo/BFO_0000002"
const conceptNotationDefault = "BFO:0000002"
const searchDefault = "entity"


// Readline interface
const color_headline = "\x1b[1m\x1b[34m"
const color_prompt = "\x1b[36m"
const color_debug = "\x1b[35m"
const color_reset = "\x1b[0m"
const rl = readline.createInterface({ input, output })

function prompt(text, color){
  const output = color + text + color_reset
  console.log(output)
}

async function ask(prompt, defaultvalue) {
  if (defaultvalue) {
    prompt = "" + prompt + " (default: '" + defaultvalue + "')"
  }
  prompt = `${color_prompt}` + prompt + "\n> " + `${color_reset}`
  let result = await new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()))
  })
  if (typeof defaultvalue === "number") {
    if (result == "" || isNaN(result)) {
      return defaultvalue
    } else {
      return Number(result)
    } 
  } else {
    if (defaultvalue && result == "") {
      return defaultvalue
    }
  }
  return result
}

function out(obj, objName, time) {
  obj = jskos.clean(obj)
  let len = obj.length
  let objString = JSON.stringify(obj, null, 2)
  if (len == 0) {
    prompt(`No ${objName} found.`, color_debug)
  } else {
    prompt(objString, color_debug)
    prompt(`Loaded ${len} ${objName} in ${time} seconds.`, color_debug)
  }
}





// API Calls

async function allSchemes(id) {
  prompt(`${id}: All Schemes`, color_headline)
  let inputLimit = await ask("Please enter a limit (0 = all)", limitDefault)
  const config = {limit: inputLimit}
  const starttime = Date.now()
  const schemes = await provider.getSchemes(config)
  out(schemes, "schemes", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificSchemes(id) {
  prompt(`${id}: Specific Scheme`, color_headline)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  const config = { schemes: [ {VOCID: schemeVOCID} ] }
  const starttime = Date.now()
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function topConcepts(id) {
  prompt(`${id}: Top Concepts`, color_headline)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  const config = {scheme: { VOCID: schemeVOCID }}
  const starttime = Date.now()
  const concepts = await provider.getTop(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function allConcepts(id) {
  prompt(`${id}: All Concepts`, color_headline)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  let inputLimit = await ask("Please enter a limit (0 for all)", limitDefault)
  const config = {scheme: { VOCID: schemeVOCID }, limit: inputLimit }
  const starttime = Date.now()
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificConcept(id) {
  prompt(`${id}: Specific Concept`, color_headline)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  let conceptNotation = await ask("Please enter a concept notation [must exist in the scheme]", conceptNotationDefault)
  const config = {concepts: [{ notation: conceptNotation, inScheme: [ { VOCID: schemeVOCID } ] }]}
  const starttime = Date.now()
  const concept = await provider.getConcepts(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificSchemesUri(id) {
  prompt(`${id}: Specific Scheme via uris`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  // const config = { schemes: [{uri: schemeUri}] }
  const config = { schemes: [schemeUri] }
  const starttime = Date.now()
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function topConceptsUri(id) {
  prompt(`${id}: Top Concepts via uris`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  // const config = {scheme: { uri: schemeUri }, limit: 10 }
  const config = {scheme: schemeUri, limit: 10 }
  const starttime = Date.now()
  const concepts = await provider.getTop(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function allConceptsUri(id) {
  prompt(`${id}: All Concepts via uris`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  let inputLimit = await ask("Please enter a limit (0 = all)", limitDefault)
  // const config = {scheme: { uri: schemeUri }, limit: inputLimit }
  const config = {scheme: schemeUri, limit: inputLimit }
  const starttime = Date.now()
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificConceptUri(id) {
  prompt(`${id}: Specific Concept via uris`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  let conceptUri = await ask("Please enter a concept URI [must exist in the scheme]", conceptUriDefault)
  // const config = {concepts: [{ uri: conceptUri, inScheme: [ { uri: schemeUri } ] }]}
  const config = {concepts: [{ uri: conceptUri, inScheme: [ schemeUri ] }]}
  const starttime = Date.now()
  const concept = await provider.getConcepts(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function narrowConcepts(id) {
  prompt(`${id}: Narrow Concept`, color_headline)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  let conceptNotation = await ask("Please enter a concept notation [must exist in the scheme]", conceptNotationDefault)
  const config = {concept: { notation: conceptNotation, inScheme: [ { VOCID: schemeVOCID } ] }}
  const starttime = Date.now()
  const concept = await provider.getNarrower(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function narrowConceptsFromUri(id) {
  prompt(`${id}: Narrow Concept via Uri`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  let conceptUri = await ask("Please enter a concept URI [must exist in the scheme]", conceptUriDefault)
  // const config = {concept: { uri: conceptUri, inScheme: [ { uri: schemeUri } ] }}
  const config = {concept: { uri: conceptUri, inScheme: [ schemeUri ] }}
  const starttime = Date.now()
  const concept = await provider.getNarrower(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))

}

async function ancestorConcepts(id) {
  prompt(`${id}: Ancestor Concept`, color_headline)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  let conceptNotation = await ask("Please enter a concept notation [must exist in the scheme]", conceptNotationDefault)
  const config = {concept: { notation: conceptNotation, inScheme: [ { VOCID: schemeVOCID } ] }}
  const starttime = Date.now()
  const concept = await provider.getAncestors(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function ancestorConceptsFromUri(id) {
  prompt(`${id}: Ancestor Concept via Uri`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  let conceptUri = await ask("Please enter a concept URI [must exist in the scheme]", conceptUriDefault)
  // const config = {concept: { uri: conceptUri, inScheme: [ { uri: schemeUri } ] }}
  const config = {concept: { uri: conceptUri, inScheme: [ schemeUri ] }}
  const starttime = Date.now()
  const concept = await provider.getAncestors(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function searchConcepts(id) {
  prompt(`${id}: Search Concepts`, color_headline)
  let search = await ask("Please enter a search string", searchDefault)
  let inputLimit = await ask("Please enter a limit (0 = all)", limitDefault)
  const config = { search: search, limit: inputLimit, types: ["http://www.w3.org/2002/07/owl#Class"]}
  const starttime = Date.now()
  const concepts = await provider.search(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function searchConceptsScheme(id) {
  prompt(`${id}: Search Concepts in Scheme via vocabularyID`, color_headline)
  let search = await ask("Please enter a search string", searchDefault)
  let schemeVOCID = await ask("Please enter a scheme vocabularyID", specificSchemeDefault)
  let inputLimit = await ask("Please enter a limit (0 = all)", limitDefault)
  const config = { search: search, limit: inputLimit, types: ["http://www.w3.org/2002/07/owl#Class"], scheme: { VOCID: schemeVOCID } }
  const starttime = Date.now()
  const concepts = await provider.search(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function searchConceptsSchemeFromUri(id) {
  prompt(`${id}: Search Concepts in Scheme via Uri`, color_headline)
  let search = await ask("Please enter a search string", searchDefault)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  let inputLimit = await ask("Please enter a limit (0 = all)", limitDefault)
  const config = { search: search, limit: inputLimit, types: ["http://www.w3.org/2002/07/owl#Class"], scheme: schemeUri }
  const starttime = Date.now()
  const concepts = await provider.search(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function VOCIDFromUri(id) {
  prompt(`${id}: Short Form from Scheme URI`, color_headline)
  let schemeUri = await ask("Please enter a scheme URI", schemeUriDefault)
  const starttime = Date.now()
  const concept = await provider._getSchemeVOCIDFromUri(schemeUri)
  prompt(`Short form of scheme ${schemeUri} is: ${concept}. It took ${((Date.now() - starttime) / 1000).toFixed(2)} seconds.`, color_debug)
}

/*
async function notationsFromConceptUri() {
  let conceptUri = await ask("Please enter a concept URI", conceptUriDefault)
  const concept = provider._getconceptNotation(conceptUri)
  prompt(`Concept notation of the concept URI ${conceptUri} is: ${concept}`, color_debug)
}
*/





// Main loop
async function mainLoop() {
  prompt("_OLS_API_TEST_CLASS_", color_headline)
  while (true) {
    prompt("What do you request? Please choose from the following options:", color_prompt)
    prompt("0: all schemes, 1: specific scheme, 2: top concepts, 3: all concepts, 4: specific concept, 5: narrower concepts, 6: ancestor concepts, 7: search concepts, 8: search concepts in a scheme, 9: suggest concepts,  10: suggest concepts in a scheme, 11: vocabulary ID from URI", color_prompt)
    const choice = (await ask("0–11 via vocabularyID and concept notation, 0b-11b via URIs, 'q' to quit")).trim()

    switch (choice) {
      case "q":
      case "Q":
        prompt("Exiting...", color_debug)
        rl.close()
        prompt("", color_reset)
        return
      case "0":
      case "0b": {
        await allSchemes(choice)
        break
      }
      case "1": {
        await specificSchemes(choice)
        break
      }
      case "1b": {
        await specificSchemesUri(choice)
        break
      }
      case "2": {
        await topConcepts(choice)
        break
      }
      case "2b": {
        await topConceptsUri(choice)
        break
      }
      case "3": {
        await allConcepts(choice)
        break
      }
      case "3b": {
        await allConceptsUri(choice)
        break
      }
      case "4": {
        await specificConcept(choice)
        break
      }
      case "4b": {
        await specificConceptUri(choice)
        break
      }
      case "5": {
        await narrowConcepts(choice)
        break
      }
      case "5b": {
        await narrowConceptsFromUri(choice)
        break
      }
      case "6": {
        await ancestorConcepts(choice)
        break
      }
      case "6b": {
        await ancestorConceptsFromUri(choice)
        break
      }
      case "7":
      case "7b": {
        await searchConcepts(choice)
        break
      }
      case "8": {
        await searchConceptsScheme(choice)
        break
      }
      case "8b": {
        await searchConceptsSchemeFromUri(choice)
        break
      }
      case "11": 
      case "11b": {
        await VOCIDFromUri(choice)
        break
      }
      default:
        prompt("Invalid choice, please pick between 0 and 11.", color_debug)
    }
    prompt("", color_reset)
  }
}
mainLoop()