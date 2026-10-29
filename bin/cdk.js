#!/usr/bin/env -S node

import fs from "node:fs"
import path from "node:path"
import { cdk, addAllProviders } from "../src/index.js"
import { requestMethods } from "../src/providers/base-provider.js"

function usage(msg) {
  if (msg) {
    console.error(msg + "\n")
  }
  console.error(`Usage: cdk [-c|--connection service.json] <method> [key=value ...]'

Call a read-only method of a service service via cocoda-sdk',

Examples:
  cdk top scheme=https://example.org/scheme
  cdk schemes
  cdk -c examples/bartoc.json suggest 21 scheme=http://bartoc.org/en/node/20000
  cdk -c examples/bartoc.json vocSuggest BK`)

  process.exit(msg ? 1 : 0)
}

function parseValue(value) {
  if (value === "true") {
    return true
  } else if (value === "false") {
    return false
  } else if (value === "null") {
    return null
  } else if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value)
  } else if (value.startsWith("{") || value.startsWith("[")) {
    return JSON.parse(value)
  }
  return value
}

const args = process.argv.slice(2)
let connection = "service.json"
let method
const search = []
const params = {}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "-c" || arg === "--connection") {
    connection = args[++i]
    continue
  } else if (arg === "-h" || arg === "--help") {
    usage()
  } else if (arg.startsWith("-")) {
    usage(`Unknown option: ${arg}`)
  } else if (arg.indexOf("=") > 0) {
    params[arg.split("=")[0]] = parseValue(arg.slice(arg.indexOf("=")+1))
  } else if (method) {
    search.push(arg)
  } else {
    method = arg.startsWith("get") || /earch|uggest/.test(arg)
      ? arg : `get${arg[0].toUpperCase()}${arg.slice(1)}`
  }
}

if (connection[0] != "/") {
  connection = path.resolve(process.cwd(), connection)
}
if (!fs.existsSync(connection)) {
  usage(`Missing connection file ${connection}`)
}
const config = JSON.parse(fs.readFileSync(connection, "utf8"))

addAllProviders()
const service = cdk.initializeRegistry(config)
service.logRequest = url => console.error(url)

if (!method) {
  const methods = requestMethods.map(m => m.method)
    .filter(m => /^get|earch|uggest/.test(m))
  // TODO: filter actual capabilities of the service
  usage(`Expected method, one of: ${methods.join("\n")}`)
}

if (typeof params["scheme"] === "string") {
  params["scheme"] = { uri: params["scheme"] }
}
if (search.length) {
  params["search"] = search.join(" ")
}

console.error(`${service.constructor.name} with endpoint ${config.endpoint}`)
console.error(`${method} ${JSON.stringify(params)}`)

const result = await service[method](params)

// Recursively remove underscore fields (internal)
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
