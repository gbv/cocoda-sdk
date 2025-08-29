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
const rl = readline.createInterface({ input, output })

async function ask(question, defaultvalue) {
  question = "\x1b[36m" + question + "\n>\x1b[0m "
  let result = await new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
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
    console.log(`\x1b[35mNo ${objName} found.\x1b[0m`)
  } else {
    console.log(objString)
    console.log(`\x1b[35mLoaded ${len} ${objName}.\x1b[0m`)
  }
}




// API Calls
async function allSchemes() {
  let inputLimit = await ask("_Option_0:_All_Schemes_ \nPlease enter a limit (0 for all)", 0)
  const config = {limit: inputLimit}
  const schemes = await provider.getSchemes(config)
  out(schemes, "schemes")
}

async function specificSchemes() {
  let schemeId = await ask("_Option_1:_Specific_Scheme_ \nPlease enter a scheme ID (eg. 'gndo')", "gndo")
  const config = { schemes: [{id: schemeId}] }
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme")
}

async function topConcepts() {
  let schemeId = await ask("_Option_2:_Top_Concepts_ \nPlease enter a scheme ID (eg. 'gndo')", "gndo")
  const config = {scheme: { id: schemeId }, limit: 10 }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function allConcepts() {
  let schemeId = await ask("_Option_3:_All_Concepts_ \nPlease enter a scheme ID (eg. 'gndo')", "gndo")
  let inputLimit = await ask("Please enter a limit (0 for all)", 0)
  const config = {scheme: { id: schemeId }, limit: inputLimit }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function specificConcept() {
  let schemeId = await ask("_Option_4:_Specific_Concept_ \nPlease enter a scheme ID (eg. 'gnd')", "gnd")
  let conceptId = await ask("Please enter a concept ID (eg: '4179484-9')", "4179484-9")
  const config = {concepts: [{ id: conceptId, inScheme: [ { id: schemeId } ] }]}
  const concept = await provider.getConcepts(config)
  out(concept, "concept")
}

async function specificSchemesUri() {
  let schemeUri = await ask("_Option_1:_Specific_Scheme_ \nPlease enter a scheme URI (eg. 'http://d-nb.info/standards/elementset/gnd#')", "http://d-nb.info/standards/elementset/gnd#")
  const config = { schemes: [{uri: schemeUri}] }
  const scheme = await provider.getSchemes(config)
  out(scheme, "scheme")
}

async function topConceptsUri() {
  let schemeUri = await ask("_Option_2:_Top_Concepts_ \nPlease enter a scheme URI (eg. 'http://d-nb.info/standards/elementset/gnd#')", "http://d-nb.info/standards/elementset/gnd#")
  const config = {scheme: { uri: schemeUri }, limit: 10 }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function allConceptsUri() {
  let schemeUri = await ask("_Option_3:_All_Concepts_ \nPlease enter a scheme URI (eg. 'http://d-nb.info/standards/elementset/gnd#')", "http://d-nb.info/standards/elementset/gnd#")
  let inputLimit = await ask("Please enter a limit (0 for all)", 0)
  const config = {scheme: { uri: schemeUri }, limit: inputLimit }
  const concepts = await provider.getConcepts(config)
  out(concepts, "concepts")
}

async function specificConceptUri() {
  let schemeUri = await ask("_Option_4:_Specific_Concept_ \nPlease enter a scheme URI (eg. 'https://lobid.org/gnd')", "https://lobid.org/gnd")
  let conceptUri = await ask("Please enter a concept ID (eg: 'https://d-nb.info/gnd/4179484-9')", "https://d-nb.info/gnd/4179484-9")
  const config = {concepts: [{ uri: conceptUri, inScheme: [ { uri: schemeUri } ] }]}
  const concept = await provider.getConcepts(config)
  out(concept, "concept")
}




// Main loop
async function mainLoop() {
  while (true) {
    const choice = (await ask(
      "Choose an option (0–4 via ids, 0b-4b via URIs, 'q' to quit).\n" +
        "Options: 0: all schemes, 1: specific scheme, 2: top concepts, 3: all concepts, 4: specific concept",
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