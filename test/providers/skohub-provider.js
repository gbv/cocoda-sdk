const SkohubProvider = require("../../providers/skohub")
const assert = require("assert")
const MockAdapter = require("axios-mock-adapter")

const scheme = { uri: "https://w3id.org/class/esc/scheme" }

const registry = new SkohubProvider({ provider: "Skohub", schemes: [scheme] })
const mock = new MockAdapter(registry.axios)

describe("SkohubProvider", () => {

  beforeEach(() => {
    mock.resetHandlers()
  })

  it("should load scheme details", async () => {
    mock.onGet().reply(200, require("./skohub-data/scheme"))
    const schemes = await registry.getSchemes()

    assert.equal(schemes.length, 1)
    assert.deepEqual(schemes[0].prefLabel, { en: "Educational Subjects Classification" })
  })

  it("should have loaded top concepts", async () => {
    const topConcepts = await registry.getTop({scheme})

    assert.equal(topConcepts.length, 11)

    const inScheme = { inScheme: [scheme] }
    const concepts = [{ uri: "https://w3id.org/class/esc/n01", ...inScheme }, { uri: "not:found", ...inScheme }]
    const response = await registry.getConcepts({concepts})
    assert.equal(response.length, 1)
  })

  it("should load additional concepts", async () => {
    mock.onGet().reply(200, require("./skohub-data/n003"))

    const uri = "https://w3id.org/class/esc/n003"
    const concepts = [{ uri, inScheme: [scheme] }]
    const response = await registry.getConcepts({concepts})

    assert.equal(response.length, 1)
    const concept = response[0]
    assert.deepEqual(concept.prefLabel, {
      en: "Personal skills and development",
      de: "Persönliche Fähigkeiten und Entwicklung",
    })

    // console.log(response)
  })
})
