import MeshApiProvider from "../../src/providers/mesh-api-provider.js"
import assert from "assert"
import { mockHttpRequests } from "./mocks/http-requests.js"

const provider = new MeshApiProvider({
  provider: "MeshApi",
  timeout: 10000,
})


const missing = mockHttpRequests(provider.http, {
  dir: "test/providers/mocks/mesh-api-provider/",
  // debug: true,
  downloadMissing: true,
}, {
  "https://id.nlm.nih.gov/mesh/sparql?format=JSON&limit=100&offset=0&inference=true&uri=https%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2Fsparql&query=%0A++++PREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0A++++PREFIX+meshv%3A+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2Fvocab%23%3E%0A%0A++++SELECT+%3Fd+%3Fname+%3FdateCreated+%3FdateRevised+%3Fidentifier+%28GROUP_CONCAT%28%3FbroaderDescriptor%3BSEPARATOR%3D%22+%22%29+as+%3Fbroader%29%0A++++FROM+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%3E%0A++++WHERE+%7B%0A++++++%3Fd+rdfs%3Alabel+%3Fname+.%0A++++++%3Fd+meshv%3Aidentifier+%3Fidentifier+.%0A++++++VALUES+%3Fd+%7B+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2FC000002%3E+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AdateCreated+%3FdateCreated+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AdateRevised+%3FdateRevised+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AbroaderDescriptor+%3FbroaderDescriptor+%7D+.%0A++++%7D%0A++++GROUP+BY+%3Fd+%3Fname+%3FdateCreated+%3FdateRevised+%3Fidentifier%0A++++ORDER+BY+%3Fd%0A++++&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"concept.json",
  "https://id.nlm.nih.gov/mesh/sparql?format=JSON&limit=100&offset=0&inference=true&uri=https%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2Fsparql&query=%0A++++PREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0A++++PREFIX+meshv%3A+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2Fvocab%23%3E%0A%0A++++SELECT+%3Fd+%3Fname+%3FdateCreated+%3FdateRevised+%3Fidentifier+%28GROUP_CONCAT%28%3FbroaderDescriptor%3BSEPARATOR%3D%22+%22%29+as+%3Fbroader%29%0A++++FROM+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%3E%0A++++WHERE+%7B%0A++++++%3Fd+rdfs%3Alabel+%3Fname+.%0A++++++%3Fd+meshv%3Aidentifier+%3Fidentifier+.%0A++++++%3Fd+meshv%3AbroaderDescriptor+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2FD000022%3E+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AdateCreated+%3FdateCreated+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AdateRevised+%3FdateRevised+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AbroaderDescriptor+%3FbroaderDescriptor+%7D+.%0A++++%7D%0A++++GROUP+BY+%3Fd+%3Fname+%3FdateCreated+%3FdateRevised+%3Fidentifier%0A++++ORDER+BY+%3Fd%0A++++&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"narrower.json",
  "https://id.nlm.nih.gov/mesh/sparql?format=JSON&limit=100&offset=0&inference=true&uri=https%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2Fsparql&query=%0A++++PREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0A++++PREFIX+meshv%3A+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%2Fvocab%23%3E%0A%0A++++SELECT+%3Fd+%3Fname+%3FdateCreated+%3FdateRevised+%3Fidentifier+%28GROUP_CONCAT%28%3FbroaderDescriptor%3BSEPARATOR%3D%22+%22%29+as+%3Fbroader%29%0A++++FROM+%3Chttp%3A%2F%2Fid.nlm.nih.gov%2Fmesh%3E%0A++++WHERE+%7B%0A++++++%3Fd+rdfs%3Alabel+%3Fname+.%0A++++++%3Fd+meshv%3Aidentifier+%3Fidentifier+.%0A++++++FILTER%28REGEX%28%3Fname%2C%22test%22%2C%22i%22%29%29%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AdateCreated+%3FdateCreated+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AdateRevised+%3FdateRevised+%7D+.%0A++++++OPTIONAL+%7B+%3Fd+meshv%3AbroaderDescriptor+%3FbroaderDescriptor+%7D+.%0A++++%7D%0A++++GROUP+BY+%3Fd+%3Fname+%3FdateCreated+%3FdateRevised+%3Fidentifier%0A++++ORDER+BY+%3Fd%0A++++&language=en%2Cde%2Cfr%2Ces%2Cnl%2Cit%2Cfi%2Cpl%2Cru%2Ccs%2Cjp":"suggest.json",
})

after(() => missing.forEach(url => console.log(`Missing response for: ${url}`)))

describe("MeshAPIProvider", function() {
  this.timeout(10000)

  it("should instantiate MeshAPIProvider", () => {
    assert(provider instanceof MeshApiProvider)
  })

  it("getConcepts", async () => {
    const result = await provider.getConcepts({concepts: [{uri: "http://id.nlm.nih.gov/mesh/C000002"}]})
    assert(Array.isArray(result))
    assert(result[0])
    assert(result[0].uri === "http://id.nlm.nih.gov/mesh/C000002")
  })

  it("getSchemes", async () => {
    const result = await provider.getSchemes()
    assert(Array.isArray(result))
    assert(result[0])
    assert(result[0].uri === "http://id.nlm.nih.gov/mesh")
  })

  it("getNarrower", async () => {
    const result = await provider.getNarrower({concept: {uri: "http://id.nlm.nih.gov/mesh/D000022"}})
    assert(Array.isArray(result))
    assert(result[0])
    assert(result[0].uri === "http://id.nlm.nih.gov/mesh/D000026")
  })

  it("search", async () => {
    const result = await provider.search({search: "test", scheme: {uri: "http://id.nlm.nih.gov/mesh"}})
    assert(Array.isArray(result))
    assert(result[0])
    assert(result[0].uri)
  })

  it("suggest", async () => {
    const result = await provider.suggest({search: "test", scheme: {uri: "http://id.nlm.nih.gov/mesh"}})
    assert(Array.isArray(result))
    assert(result[0] === "test")
    assert(Array.isArray(result[1]) && result[1].length > 0)
    assert(Array.isArray(result[2]) && result[2].length === 0)
    assert(Array.isArray(result[3]) && result[3].length > 0)
  })
})
