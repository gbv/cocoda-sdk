import MeshApiProvider from "../../src/providers/mesh-api-provider.js"
import assert from "assert"
import fs from "fs"
import { mockRequests } from "./requests.js"

const provider = new MeshApiProvider({
  endpoint: "https://id.nlm.nih.gov/mesh/query"
})

const missing = mockRequests(provider.axios, {
  dir: "test/providers/mesh-api-provider/",
  debug: true,
  downloadMissing: true,
}, {
  "https://id.nlm.nih.gov/mesh/D000900.json": "D000900.json"
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

describe("MeshApiProvider", () => {

  it("getSchemes", async () => {
    const schemes = await provider.getSchemes()
    assert.equal(schemes[0].uri, "http://id.nlm.nih.gov/mesh")
  })

/*
    data: true,
    concepts: true,
    narrower: true,
    suggest: true,
    search: true,
*/

  it("getConcepts", async () => {
    const concepts = [{uri:"http://id.nlm.nih.gov/mesh/D000900"}]
    const record = await provider.getConcepts({ concepts })
    
    // TODO
  })

}) 
