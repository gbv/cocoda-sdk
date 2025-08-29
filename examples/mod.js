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
  language: "und",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})


// Readline interface
const color_headline = "\x1b[1m\x1b[34m"
const color_prompt = "\x1b[36m"
const color_debug = "\x1b[35m"
const color_reset = "\x1b[0m"
const rl = readline.createInterface({ input, output })

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

function out(obj, objName) {
  obj = jskos.clean(obj)
  let len = obj.length
  let objString = JSON.stringify(obj, null, 2)
  if (len == 0) {
    console.log(`${color_debug}No ${objName} found.${color_reset}`)
  } else {
    console.log(objString)
    console.log(`${color_debug}Loaded ${len} ${objName}.${color_reset}`)
  }
}




// API Calls
async function allSchemes() {
  console.log(`${color_headline}0: All Schemes${color_reset}`)
  let inputLimit = await ask("Please enter a limit (0 = all)", 0)
  const config = {limit: inputLimit}
  const schemes = await provider.getSchemes(config)
  out(schemes, "schemes")
}

async function specificSchemes() {
  console.log(`${color_headline}1: Specific Scheme${color_reset}`)
  let schemeShort = await ask("Please enter a scheme short name", "gndo")
  const config = { schemes: [ {short: schemeShort} ] }
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme")
}

async function topConcepts() {
  console.log(`${color_headline}2: Top Concepts${color_reset}`)
  let schemeShort = await ask("Please enter a scheme short name", "gndo")
  const config = {scheme: { short: schemeShort }, limit: 10 }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function allConcepts() {
  console.log(`${color_headline}3: All Concepts${color_reset}`)
  let schemeShort = await ask("Please enter a scheme short name", "gndo")
  let inputLimit = await ask("Please enter a limit (0 for all)", 0)
  const config = {scheme: { short: schemeShort }, limit: inputLimit }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function specificConcept() {
  console.log(`${color_headline}4: Specific Concept${color_reset}`)
  let schemeShort = await ask("Please enter a scheme short name", "gnd")
  let conceptNotation = await ask("Please enter a concept notation [must exist in the scheme]", "4179484-9")
  const config = {concepts: [{ notation: conceptNotation, inScheme: [ { short: schemeShort } ] }]}
  const concept = await provider.getConcepts(config)
  out(concept, "concept")
}

async function specificSchemesUri() {
  console.log(`${color_headline}1b: Specific Scheme via uris${color_reset}`)
  let schemeUri = await ask("Please enter a scheme URI", "http://d-nb.info/standards/elementset/gnd#")
  const config = { schemes: [{uri: schemeUri}] }
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme")
}

async function topConceptsUri() {
  console.log(`${color_headline}2b: Top Concepts via uris${color_reset}`)
  let schemeUri = await ask("Please enter a scheme URI", "http://d-nb.info/standards/elementset/gnd#")
  const config = {scheme: { uri: schemeUri }, limit: 10 }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function allConceptsUri() {
  console.log(`${color_headline}3b: All Concepts via uris${color_reset}`)
  let schemeUri = await ask("Please enter a scheme URI", "http://d-nb.info/standards/elementset/gnd#")
  let inputLimit = await ask("Please enter a limit (0 = all)", 0)
  const config = {scheme: { uri: schemeUri }, limit: inputLimit }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function specificConceptUri() {
  console.log(`${color_headline}4b: Specific Concept via uris${color_reset}`)
  let schemeUri = await ask("Please enter a scheme URI", "https://lobid.org/gnd")
  let conceptUri = await ask("Please enter a concept URI [must exist in the scheme]", "https://d-nb.info/gnd/4179484-9")
  const config = {concepts: [{ uri: conceptUri, inScheme: [ { uri: schemeUri } ] }]}
  const concept = await provider.getConcepts(config)
  out(concept, "concept")
}




// Main loop
async function mainLoop() {
  while (true) {
    console.log(`${color_headline}_MOD_API_TEST_CLASS_${color_reset}`)
    const choice = (await ask(
      "What do you request? Please choose from the following options:\n" +
        "0: all schemes, 1: specific scheme, 2: top concepts, 3: all concepts, 4: specific concept\n0–4 via short-form and notation, 0b-4b via URIs, 'q' to quit",
    )).trim()

    switch (choice) {
      case "q":
      case "Q":
        console.log("Exiting...")
        rl.close()
        console.log()
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
      default:
        console.log("Invalid choice, please pick between 0 and 4.")
    }
    console.log()
  }
}
mainLoop()