import { cdk, addAllProviders } from "../src/index.js"
import * as jskos from "jskos-tools"
import readline from "node:readline"
import { stdin as input, stdout as output } from "node:process"

// Provider
addAllProviders()
const provider = cdk.initializeRegistry({
  provider: "ModApi",
  // api: "https://bartoc.org/api/",
  uri: "https://terminology.services.base4nfdi.de/api-gateway", // "http://localhost:8080/api-gateway" if api-gateway is running locally
  // uri: "http://localhost:8080/api-gateway", // "http://localhost:8080/api-gateway" if api-gateway is running locally
  language: "und",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})


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
async function allSchemes() {
  prompt("0: All Schemes", color_headline)
  let inputLimit = await ask("Please enter a limit (0 = all)", 0)
  const config = {limit: inputLimit}
  const starttime = Date.now()
  const schemes = await provider.getSchemes(config)
  out(schemes, "schemes", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificSchemes() {
  prompt("1: Specific Scheme", color_headline)
  let schemeShort = await ask("Please enter a scheme short name", "gndo")
  const config = { schemes: [ {short: schemeShort} ] }
  const starttime = Date.now()
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function topConcepts() {
  prompt("2: Top Concepts", color_headline)
  let schemeShort = await ask("Please enter a scheme short name", "gndo")
  const config = {scheme: { short: schemeShort }, limit: 10 }
  const starttime = Date.now()
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function allConcepts() {
  prompt("3: All Concepts", color_headline)
  let schemeShort = await ask("Please enter a scheme short name", "gndo")
  let inputLimit = await ask("Please enter a limit (0 for all)", 0)
  const config = {scheme: { short: schemeShort }, limit: inputLimit }
  const starttime = Date.now()
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificConcept() {
  prompt("4: Specific Concept", color_headline)
  let schemeShort = await ask("Please enter a scheme short name", "gnd")
  let conceptNotation = await ask("Please enter a concept notation [must exist in the scheme]", "4179484-9")
  const config = {concepts: [{ notation: conceptNotation, inScheme: [ { short: schemeShort } ] }]}
  const starttime = Date.now()
  const concept = await provider.getConcepts(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificSchemesUri() {
  prompt("1b: Specific Scheme via uris", color_headline)
  let schemeUri = await ask("Please enter a scheme URI", "http://d-nb.info/standards/elementset/gnd#")
  const config = { schemes: [{uri: schemeUri}] }
  const starttime = Date.now()
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function topConceptsUri() {
  prompt("2b: Top Concepts via uris", color_headline)
  let schemeUri = await ask("Please enter a scheme URI", "http://d-nb.info/standards/elementset/gnd#")
  const config = {scheme: { uri: schemeUri }, limit: 10 }
  const starttime = Date.now()
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function allConceptsUri() {
  prompt("3b: All Concepts via uris", color_headline)
  let schemeUri = await ask("Please enter a scheme URI", "http://d-nb.info/standards/elementset/gnd#")
  let inputLimit = await ask("Please enter a limit (0 = all)", 0)
  const config = {scheme: { uri: schemeUri }, limit: inputLimit }
  const starttime = Date.now()
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function specificConceptUri() {
  prompt("4b: Specific Concept via uris", color_headline)
  let schemeUri = await ask("Please enter a scheme URI", "https://lobid.org/gnd")
  let conceptUri = await ask("Please enter a concept URI [must exist in the scheme]", "https://d-nb.info/gnd/4179484-9")
  const config = {concepts: [{ uri: conceptUri, inScheme: [ { uri: schemeUri } ] }]}
  const starttime = Date.now()
  const concept = await provider.getConcepts(config)
  out(concept, "concept", ((Date.now() - starttime) / 1000).toFixed(2))
}

async function shortFormFromUri() {
  prompt("5: Short Form from Scheme URI", color_headline)
  let schemeUri = await ask("Please enter a scheme URI", "https://lobid.org/gnd")
  const starttime = Date.now()
  const concept = await provider._getSchemeShort(schemeUri)
  prompt(`Short form of scheme ${schemeUri} is: ${concept}. It took ${((Date.now() - starttime) / 1000).toFixed(2)} seconds.`, color_debug)
}

async function notationsFromConceptUri() {
  let conceptUri = await ask("Please enter a concept URI", "https://d-nb.info/gnd/4179484-9")
  const concept = provider._getconceptNotation(conceptUri)
  prompt(`Concept notation of the concept URI ${conceptUri} is: ${concept}`, color_debug)
}


// Main loop
async function mainLoop() {
  prompt("_MOD_API_TEST_CLASS_", color_headline)
  while (true) {

    
    prompt("What do you request? Please choose from the following options:", color_prompt)
    prompt("0: all schemes, 1: specific scheme, 2: top concepts, 3: all concepts, 4: specific concept", color_prompt)
    prompt("0–4 via short-form and notation, 0b-4b via URIs,", color_prompt)
    const choice = (await ask("5 for requesting short-form from scheme URI, 6 to request a concept notation from a concept URI, 'q' to quit")).trim()

    switch (choice) {
      case "q":
      case "Q":
        prompt("Exiting...", color_debug)
        rl.close()
        prompt("", color_reset)
        return
      case "0":
      case "0b": {
        await allSchemes()
        break
      }
      case "1": {
        await specificSchemes()
        break
      }
      case "1b": {
        await specificSchemesUri()
        break
      }
      case "2": {
        await topConcepts()
        break
      }
      case "2b": {
        await topConceptsUri()
        break
      }
      case "3": {
        await allConcepts()
        break
      }
      case "3b": {
        await allConceptsUri()
        break
      }
      case "4": {
        await specificConcept()
        break
      }
      case "4b": {
        await specificConceptUri()
        break
      }

      case "5": {
        await shortFormFromUri()
        break
      }
      case "6": {
        await notationsFromConceptUri()
        break
      }
      default:
        prompt("Invalid choice, please pick between 0 and 4.", color_debug)
    }
    prompt("", color_reset)
  }
}
mainLoop()