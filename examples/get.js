/**
 * Small CLI for read-access to services. Example usage:
 * 
 * node examples/get.js -c examples/bartoc.json schemes limit=2
 * node examples/get.js -c examples/tib.json top scheme=https://w3id.org/amv
 */
import fs from "node:fs"
import path from "node:path"
import { cdk, addAllProviders } from "../src/index.js"

function usage(status=0) {
  console.error("Usage: node get.js [-c|--connection service.json] <method> [key=value ...]")
  console.error("")
  console.error("Example: node get.js top scheme=https://example.org/scheme")
  process.exit(status)
}

const parseValue = (value) => {
  if (value === "true") {
    return true
  }
  if (value === "false") {
    return false
  }
  if (value === "null") {
    return null
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value)
  }
  if (value.startsWith("{") || value.endsWith("}")) {
    return JSON.parse(value)
  }
  return value
}

const args = process.argv.slice(2)
let serviceFile = "service.json"
let method
const opts = {}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "-c" || arg === "--connection") {
    serviceFile = args[++i]
    continue
  } else if (arg === "-h" || arg === "--help") {
    usage()
  } else if (arg.startsWith("-")) {
    console.error(`Unknown option: ${arg}`)
    usage(1)
  } else if (arg.indexOf("=") > 0) {
    opts[arg.split("=")[0]] = parseValue(arg.slice(arg.indexOf("=")+1))
  } else if (method) {
    console.error("Too many arguments")
    usage(1)
  } else {
    method = arg.startsWith("get") ? arg : `get${arg[0].toUpperCase()}${arg.slice(1)}`
  }
}

if (!method) {
  usage(1)
}

if (serviceFile[0] != "/") {
  serviceFile = path.resolve(process.cwd(), serviceFile)
}
const config = JSON.parse(fs.readFileSync(serviceFile, "utf8"))

addAllProviders()
const provider = cdk.initializeRegistry(config)

console.error(`${method} from ${provider.constructor.name} with endpoint ${config.endpoint}`)

if (typeof opts["scheme"] === "string") {
  opts["scheme"] = { uri: opts["scheme"] }
}

console.error(JSON.stringify(opts, 0, 2))
const result = await provider[method](opts)

// Recursively remove underscore fields
function cleanJSON(json, depth = 0) {
  if (Array.isArray(json)) {
    json.forEach(value => cleanJSON(value, depth))
  } else if (typeof json === "object") {
    for (let key in json) {
      if (key.startsWith("_")) {
        delete json[key]
      } else {
        cleanJSON(json[key], depth + 1)
      }
    }
  }
  return json
}

console.log(JSON.stringify(cleanJSON(result), null, 2))
