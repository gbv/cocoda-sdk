import SkosmosApiProvider from "../../src/providers/skosmos-api-provider.js"
import assert from "assert"
import fs from "fs"
import { mockRequests } from "./requests.js"
import jskos from "jskos-tools"


const provider = new SkosmosApiProvider({
  endpoint: "https://skosmos.bartoc.org/rest/v1/",
  uriTemplate: "http://bartoc.org/en/node/{vocid}/",
})

const missing = mockRequests(provider.axios, {
  dir: "test/providers/skosmos-provider/",
  // debug: true,
  downloadMissing: true,
}, {
  "https://skosmos.bartoc.org/rest/v1/20691/data?uri=https%3A%2F%2Fwww.w3id.org%2Farchlink%2Fterms%2Fconservationthesaurus%2FC3A182&format=application%2Fjson&lang=en?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":
  "skosmos-concept.json",
  "https://skosmos.bartoc.org/rest/v1/vocabularies?lang=en&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"skosmos-schemes.json",
  "https://skosmos.bartoc.org/rest/v1/7/?lang=en?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"skosmos-scheme-7.json",
  "https://skosmos.bartoc.org/rest/v1/11/?lang=en?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"skosmos-scheme-11.json",
  "https://skosmos.bartoc.org/rest/v1/15/?lang=en?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"skosmos-scheme-15.json",
  "https://skosmos.bartoc.org/rest/v1/28/?lang=en?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"skosmos-scheme-28.json",
  "https://skosmos.bartoc.org/rest/v1/29/?lang=en?language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"skosmos-scheme-29.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

const schemeVOCIDDefault = "20691"
const schemeUriDefault = "https://www.w3id.org/archlink/terms/conservationthesaurus"
const conceptUriDefault = "https://www.w3id.org/archlink/terms/conservationthesaurus/C3A182"


describe("SkosmosApiProvider.getConcepts", () => {

  it("request single concept", async function () {
    const config = {concepts:{uri: conceptUriDefault, inScheme: [{uri: schemeUriDefault, VOCID: schemeVOCIDDefault}]}}
    const conceptresult = await jskos.clean(await provider.getConcepts( config ))

    assert.equal(conceptresult.length, 1)

    const example_jskos_raw = fs.readFileSync("test/providers/skosmos-provider/example_jskos.json", "utf-8")
    const example_jskos_json = JSON.parse(example_jskos_raw)

    for (let key in example_jskos_json) {
      const valuereal = await conceptresult[0][key]
      const valuetest = await example_jskos_json[key]
      assert.deepEqual( valuereal, valuetest, `Value for key '${key}' expects '${valuetest}' but got '${valuereal}'.`)
    }
    for (let key in conceptresult[0]) {
      const valuereal = await conceptresult[0][key]
      const valuetest = await example_jskos_json[key]
      assert.deepEqual( valuereal, valuetest, `Value for key '${key}' expects '${valuetest}' but got '${valuereal}'.`)
    }
  })
})


describe("SkosmosApiProvider.getSchemes", () => {
  it("_getSkosSchemes", async function () {
    const schemes = (await provider._getSkosSchemes()).slice(0, 5)
    assert.equal(schemes.length, 5)
    ,   assert.deepEqual(schemes.map(s => s.VOCID), ["7", "11", "15", "28", "29"])
  })
  
  it("getSchemes", async function () {
    const schemes = (await provider.getSchemes()).slice(0, 5)
    assert.equal(schemes.length, 5)
    assert.deepEqual(schemes.map(s => s.VOCID), ["7", "11", "15", "28", "29"])
  })

  it("get specific Schemes", async function () {
    const config = {params: {uri: "http://bartoc.org/en/node/7/|http://bartoc.org/en/node/29/"}}
    const schemes = await provider.getSchemes(config)
    assert.equal(schemes.length, 2)
    assert.deepEqual(schemes.map(s => s.VOCID), ["7", "29"])
  })  

})