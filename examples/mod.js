import { cdk, addAllProviders } from "../src/index.js"
import * as jskos from "jskos-tools"
import readline from "node:readline"
import { stdin as input, stdout as output } from "node:process"

// Provider
addAllProviders()
const provicer = cdk.initializeRegistry({
  provider: "ModApi",
  // api: "https://bartoc.org/api/",
  uri: "https://terminology.services.base4nfdi.de/api-gateway", // "http://localhost:8080/api-gateway" if api-gateway is running locally
  language: "und",           // language to use for labels and descriptions. if no language is given in mod, it defaults to "en"
  cleancontext: true,       // if true, the @context element will be cleaned up to remove unnecessary keys
})


// Readline interface
const rl = readline.createInterface({ input, output })

function ask(question) {
  question = "\x1b[36m" + question + "\n>\x1b[0m "
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}




// API Calls
async function allSchemes(inputLimit) {
  const config = {limit: inputLimit}
  const schemes = await provicer.getSchemes(config)
  console.log(jskos.clean(schemes))
}

async function specificSchemes(schemeId) {
  const config = { schemes: [{id: schemeId}] }
  const scheme = await provicer.getSchemes(config)
  console.log(jskos.clean(scheme))
}

async function topConcepts(schemeId) {
  const config = {scheme: { id: schemeId }, limit: 10 }
  const concepts = await provicer.getConcepts(config)
  console.log(jskos.clean(concepts))
}

async function allConcepts(schemeId, inputLimit) {
  const config = {scheme: { id: schemeId }, limit: inputLimit }
  const concepts = await provicer.getConcepts(config)
  console.log(jskos.clean(concepts))
}

async function specificConcept(schemeId, conceptId) {
  const config = {concepts: [{ id: conceptId, inScheme: [ { id: schemeId } ] }]}
  const concept = await provicer.getConcepts(config)
  console.log(jskos.clean(concept))
}

async function specificSchemesUri(schemeUri) {
  const config = { schemes: [{uri: schemeUri}] }
  const scheme = await provicer.getSchemes(config)
  console.log(jskos.clean(scheme))
}

async function topConceptsUri(schemeUri) {
  const config = {scheme: { uri: schemeUri }, limit: 10 }
  const concepts = await provicer.getConcepts(config)
  console.log(jskos.clean(concepts))
}

async function allConceptsUri(schemeUri, inputLimit) {
  const config = {scheme: { uri: schemeUri }, limit: inputLimit }
  const concepts = await provicer.getConcepts(config)
  console.log(jskos.clean(concepts))
}

async function specificConceptUri(schemeUri, conceptUri) {
  const config = {concepts: [{ uri: conceptUri, inScheme: [ { uri: schemeUri } ] }]}
  const concept = await provicer.getConcepts(config)
  console.log(jskos.clean(concept))
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
        let inputLimit = await ask("_Option_0:_All_Schemes_ \nPlease enter a limit (0 for all)")
        if (inputLimit == "" || isNaN(inputLimit)) {
          inputLimit = 0
        }
        await allSchemes(Number(inputLimit))
        break
      }
      case "1": {
        let schemeID = await ask("_Option_1:_Specific_Scheme_ \nPlease enter a scheme ID (eg. 'gndo')")
        if (schemeID == "") {
          schemeID = "gndo"
        }
        await specificSchemes(schemeID)
        break
      }
      case "2": {
        let schemeID = await ask("_Option_2:_Top_Concepts_ \nPlease enter a scheme ID (eg. 'gndo')")
        if (schemeID == "") {
          schemeID = "gndo"
        }
        await topConcepts(schemeID)
        break
      }
      case "3": {
        let schemeID = await ask("_Option_3:_All_Concepts_ \nPlease enter a scheme ID (eg. 'gndo')")
        if (schemeID == "") {
          schemeID = "gndo"
        }
        let inputLimit = await ask("Please enter a limit (0 for all)")
        if (inputLimit == "" || isNaN(inputLimit)) {
          inputLimit = 0
        }
        await allConcepts(schemeID, Number(inputLimit))
        break
      }
      case "4": {
        let schemeID = await ask("_Option_4:_Specific_Concept_ \nPlease enter a scheme ID (eg. 'gnd')")
        if (schemeID == "") {
          schemeID = "gnd"
        }
        let conceptID = await ask("Please enter a concept ID (eg: '4179484-9')")
        if (conceptID == "") {
          conceptID = "4179484-9"
        }
        await specificConcept(schemeID, conceptID)
        break
      }
      case "1b": {
        let schemaUri = await ask("_Option_1:_Specific_Scheme_ \nPlease enter a scheme URI (eg. 'http://d-nb.info/standards/elementset/gnd#')")
        if (schemaUri == "") {
          schemaUri = "http://d-nb.info/standards/elementset/gnd#"
        }
        await specificSchemesUri(schemaUri)
        break
      }
      case "2b": {
        let schemaUri = await ask("_Option_2:_Top_Concepts_ \nPlease enter a scheme URI (eg. 'http://d-nb.info/standards/elementset/gnd#')")
        if (schemaUri == "") {
          schemaUri = "http://d-nb.info/standards/elementset/gnd#"
        }
        await topConceptsUri(schemaUri)
        break
      }
      case "3b": {
        let schemaUri = await ask("_Option_3:_All_Concepts_ \nPlease enter a scheme URI (eg. 'http://d-nb.info/standards/elementset/gnd#')")
        if (schemaUri == "") {
          schemaUri = "http://d-nb.info/standards/elementset/gnd#"
        }
        let inputLimit = await ask("Please enter a limit (0 for all)")
        if (inputLimit == "" || isNaN(inputLimit)) {
          inputLimit = 0
        }
        await allConceptsUri(schemaUri, Number(inputLimit))
        break
      }
      case "4b": {
        let schemaUri = await ask("_Option_4:_Specific_Concept_ \nPlease enter a scheme URI (eg. 'https://lobid.org/gnd')")
        if (schemaUri == "") {
          schemaUri = "https://lobid.org/gnd"
        }
        let conceptUri = await ask("Please enter a concept ID (eg: 'https://d-nb.info/gnd/4179484-9')")
        if (conceptUri == "") {
          conceptUri = "https://d-nb.info/gnd/4179484-9"
        }
        await specificConceptUri(schemaUri, conceptUri)
        break
      }
      default:
        console.log("Invalid choice, please pick between 0 and 4.")
    }
    console.log()
  }
}
mainLoop()