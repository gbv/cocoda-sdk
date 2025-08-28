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
  question = question + "\n> "
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}




// API Calls
async function allVocabularies(inputLimit) {
  const schemes = await provicer.getSchemes({limit: inputLimit})
  if (inputLimit <= 0){
    console.log(`Loaded ${schemes.length} schemes.`)
  }
  for (let scheme of schemes) {
    console.log(jskos.clean(scheme))
  }
}

async function specificVocabulary(schemeURI) {
  console.log(`method "specificVocabulary" received schemeURI: "${schemeURI}"`)
}

async function topConcepts(schemeURI) {
  console.log(`method "topConcepts" received schemeURI: "${schemeURI}"`)
}

async function allConcepts(schemeURI, inputLimit) {
  console.log(`method "allConcepts" received schemeURI: "${schemeURI}", limit: ${inputLimit}`)
}

async function specificConcept(schemeURI, conceptId) {
  const config = {concepts: [{ uri: conceptId, inScheme: [ { uri: schemeURI } ] }]}
  console.log(`method "specificConcept" received schemeURI: "${schemeURI}", conceptId: "${conceptId}"`)
  const concept = await provicer.getConcepts(config)
  console.log(jskos.clean(concept))
}




// Main loop
async function mainLoop() {
  while (true) {
    const choice = (await ask(
      "Choose an option 0–4 (or 'q' to quit).\n" +
        "Options: 0: all schemes, 1: specific scheme, 2: top concepts, 3: all concepts, 4: specific concept",
    )).trim()

    switch (choice) {
      case "q":
      case "Q":
        console.log("Exiting...")
        rl.close()
        console.log()
        return
      case "0": {
        let inputLimit = await ask("_Option_0:_All_Vocabularies_ \nPlease enter a limit (0 for all)")
        if (inputLimit == "" || isNaN(inputLimit)) {
          inputLimit = 0
        }
        await allVocabularies(inputLimit)
        break
      }
      case "1": {
        let schemeURI = await ask("_Option_1:_Specific_Vocabulary_ \nPlease enter a scheme URI (eg. 'https://lobid.org/gnd')")
        if (schemeURI == "") {
          schemeURI = "https://lobid.org/gnd"
        }
        await specificVocabulary(schemeURI)
        break
      }
      case "2": {
        let schemeURI = await ask("_Option_2:_Top_Concepts_ \nPlease enter a scheme URI (eg. 'https://lobid.org/gnd')")
        if (schemeURI == "") {
          schemeURI = "https://lobid.org/gnd"
        }
        await topConcepts(schemeURI)
        break
      }
      case "3": {
        let schemeURI = await ask("_Option_3:_All_Concepts_ \nPlease enter a scheme URI (eg. 'https://lobid.org/gnd')")
        if (schemeURI == "") {
          schemeURI = "https://lobid.org/gnd"
        }
        let inputLimit = await ask("Please enter a limit (0 for all)")
        if (inputLimit == "" || isNaN(inputLimit)) {
          inputLimit = 0
        }
        await allConcepts(schemeURI, inputLimit)
        break
      }
      case "4": {
        let schemeURI = await ask("_Option_4:_Specific_Concept_ \nPlease enter a scheme URI (eg. 'https://lobid.org/gnd')")
        if (schemeURI == "") {
          schemeURI = "https://lobid.org/gnd"
        }
        let conceptURI = await ask("Please enter a concept URI (eg: 'https://d-nb.info/gnd/4179484-9')")
        if (conceptURI == "") {
          conceptURI = "https://d-nb.info/gnd/4179484-9"
        }
        await specificConcept(schemeURI, conceptURI)
        break
      }
      default:
        console.log("Invalid choice, please pick between 0 and 4.")
    }
    console.log()
  }
}
mainLoop()