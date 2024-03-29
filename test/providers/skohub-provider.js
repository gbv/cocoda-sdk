import SkohubProvider from "../../src/providers/skohub-provider.js"
import assert from "assert"
import MockAdapter from "axios-mock-adapter"

const scheme = { uri: "https://w3id.org/class/esc/scheme" }

const registry = new SkohubProvider({ provider: "Skohub", schemes: [scheme] })
const mock = new MockAdapter(registry.axios)

// Test data
const schemeData = {id:"https://w3id.org/class/esc/scheme",type:"ConceptScheme",title:{en:"Educational Subjects Classification"},description:{en:"The Educational Subjects Classification (ESC) is an extension of the International Standard Classification of Education (ISCED-2013). For example, it can be used for classifying by subject services that enable access to or discovery of educational resources. It is developed and maintained in the context of the OER Worldmap (OER = Open Educational Resources)."},hasTopConcept:[{id:"https://w3id.org/class/esc/n00",notation:["00"],prefLabel:{en:"Generic programmes and qualifications",de:"Allgemeine Programme und Qualifikationen"},narrower:[{id:"https://w3id.org/class/esc/n001",notation:["001","0011"],prefLabel:{en:"Basic programmes and qualifications",de:"Grundlegende Programme und Qualifikationen"}},{id:"https://w3id.org/class/esc/n002",notation:["002","0021"],prefLabel:{en:"Literacy and numeracy",de:"Lese- und Rechenfähigkeit"}},{id:"https://w3id.org/class/esc/n003",notation:["003","0031"],prefLabel:{en:"Personal skills and development",de:"Persönliche Fähigkeiten und Entwicklung"}}]},{id:"https://w3id.org/class/esc/n01",notation:["01","011"],prefLabel:{en:"Education",de:"Bildung"},narrower:[{id:"https://w3id.org/class/esc/n0111",notation:["0111"],prefLabel:{en:"Education science",de:"Erziehungswissenschaft"}},{id:"https://w3id.org/class/esc/n0112",notation:["0112"],prefLabel:{en:"Training for pre-school teachers",de:"Ausbildung für Erzieherinnen und Erzieher"}},{id:"https://w3id.org/class/esc/n0113",notation:["0113"],prefLabel:{en:"Teacher training without subject specialisation",de:"Lehrerausbildung ohne Fachausrichtung"}},{id:"https://w3id.org/class/esc/n0114",notation:["0114"],prefLabel:{en:"Teacher training with subject specialisation",de:"Lehrerausbildung mit Fachausrichtung"}}]},{id:"https://w3id.org/class/esc/n02",notation:["02"],prefLabel:{en:"Arts and humanities",de:"Geisteswissenschaften"},narrower:[{id:"https://w3id.org/class/esc/n021",notation:["021"],prefLabel:{en:"Arts",de:"Kunst"},narrower:[{id:"https://w3id.org/class/esc/n0211",notation:["0211"],prefLabel:{en:"Audio-visual techniques and media production",de:"Audiovisuelle Techniken und Medienproduktion"}},{id:"https://w3id.org/class/esc/n0212",notation:["0212"],prefLabel:{en:"Fashion, interior and industrial design",de:"Mode, Innenarchitektur und Industriedesign"}},{id:"https://w3id.org/class/esc/n0213",notation:["0213"],prefLabel:{en:"Fine arts",de:"Bildende Künste"}},{id:"https://w3id.org/class/esc/n0214",notation:["0214"],prefLabel:{en:"Handicrafts",de:"Werken und Handarbeiten"}},{id:"https://w3id.org/class/esc/n0215",notation:["0215"],prefLabel:{en:"Music and performing arts",de:"Musik und darstellende Kunst"}}]},{id:"https://w3id.org/class/esc/n022",notation:["022"],prefLabel:{en:"Humanities (except languages)",de:"Geisteswissenschaften (außer Sprachen)"},narrower:[{id:"https://w3id.org/class/esc/n0221",notation:["0221"],prefLabel:{en:"Religion and theology",de:"Religion und Theologie"}},{id:"https://w3id.org/class/esc/n0222",notation:["0222"],prefLabel:{en:"History and archaeology",de:"Geschichte und Archäologie"}},{id:"https://w3id.org/class/esc/n0223",notation:["0223"],prefLabel:{en:"Philosophy and ethics",de:"Philosophie und Ethik"}}]},{id:"https://w3id.org/class/esc/n023",notation:["023"],prefLabel:{en:"Languages",de:"Sprachen"},narrower:[{id:"https://w3id.org/class/esc/n0231",notation:["0231"],prefLabel:{en:"Language acquisition",de:"Spracherwerb"},narrower:[{id:"https://w3id.org/class/esc/n0231-ase",notation:["0231-ase"],prefLabel:{en:"Language acquisition \\u2013 American Sign Language",de:"Spracherwerb Gebärdensprache"}},{id:"https://w3id.org/class/esc/n0231-cy",notation:["0231-cy"],prefLabel:{en:"Language acquisition \\u2013 Welsh",de:"Spracherwerb Walisisch"}},{id:"https://w3id.org/class/esc/n0231-de",notation:["0231-de"],prefLabel:{en:"Language acquisition \\u2013 German",de:"Spracherwerb Deutsch"}},{id:"https://w3id.org/class/esc/n0231-en",notation:["0231-en"],prefLabel:{en:"Language acquisition \\u2013 English",de:"Spracherwerb Englisch"}},{id:"https://w3id.org/class/esc/n0231-es",notation:["0231-es"],prefLabel:{en:"Language acquisition \\u2013 Spanish",de:"Spracherwerb Spanisch"}},{id:"https://w3id.org/class/esc/n0231-fr",notation:["0231-fr"],prefLabel:{en:"Language acquisition \\u2013 French",de:"Spracherwerb Französisch"}},{id:"https://w3id.org/class/esc/n0231-ga",notation:["0231-ga"],prefLabel:{en:"Language acquisition \\u2013 Gaelic",de:"Spracherwerb Gälisch"}},{id:"https://w3id.org/class/esc/n0231-it",notation:["0231-it"],prefLabel:{en:"Language acquisition \\u2013 Italian",de:"Spracherwerb Italienisch"}},{id:"https://w3id.org/class/esc/n0231-zh",notation:["0231-zh"],prefLabel:{en:"Language acquisition \\u2013 Chinese",de:"Spracherwerb Chinesisch"}}]},{id:"https://w3id.org/class/esc/n0232",notation:["0232"],prefLabel:{en:"Literature and linguistics",de:"Literatur- und Sprachwissenschaft"},narrower:[{id:"https://w3id.org/class/esc/n0232-en",notation:["0232-en"],prefLabel:{en:"English literature and linguistics",de:"Englische Literatur- und Sprachwissenschaft"}},{id:"https://w3id.org/class/esc/n0232-es",notation:["0232-es"],prefLabel:{en:"Spanish literature and linguistics",de:"Spanische Literatur- und Sprachwissenschaft"}},{id:"https://w3id.org/class/esc/n0232-pt",notation:["0232-pt"],prefLabel:{en:"Portuguese literature and linguistics",de:"Portugiesische Literatur- und Sprachwissenschaft"}}]}]}]},{id:"https://w3id.org/class/esc/n03",notation:["03"],prefLabel:{en:"Social sciences, journalism and information",de:"Sozialwissenschaften, Journalismus und Informationswissenschaften"},narrower:[{id:"https://w3id.org/class/esc/n031",notation:["031"],prefLabel:{en:"Social and behavioural sciences",de:"Sozialwissenschaften"},narrower:[{id:"https://w3id.org/class/esc/n0311",notation:["0311"],prefLabel:{en:"Economics",de:"Volkswirtschaftslehre"}},{id:"https://w3id.org/class/esc/n0312",notation:["0312"],prefLabel:{en:"Political sciences and civics",de:"Politikwissenschaft"}},{id:"https://w3id.org/class/esc/n0313",notation:["0313"],prefLabel:{en:"Psychology",de:"Politikwissenschaft"}},{id:"https://w3id.org/class/esc/n0314",notation:["0314"],prefLabel:{en:"Sociology and cultural studies",de:"Soziologie und Kulturwissenschaften"}}]},{id:"https://w3id.org/class/esc/n032",notation:["032"],prefLabel:{en:"Journalism and information",de:"Journalismus und Informationswissenschaften"},narrower:[{id:"https://w3id.org/class/esc/n0321",notation:["0321"],prefLabel:{en:"Journalism and reporting",de:"Journalistik"}},{id:"https://w3id.org/class/esc/n0322",notation:["0322"],prefLabel:{en:"Library, information and archival studies",de:"Bibliotheks-, Informations- und Archivwesen"}}]}]},{id:"https://w3id.org/class/esc/n04",notation:["04"],prefLabel:{en:"Business, administration and law",de:"Wirtschaft, Verwaltung und Recht"},narrower:[{id:"https://w3id.org/class/esc/n041",notation:["041"],prefLabel:{en:"Business and administration",de:"Wirtschaft und Verwaltung"},narrower:[{id:"https://w3id.org/class/esc/n0411",notation:["0411"],prefLabel:{en:"Accounting and taxation",de:"Rechnungswesen und Steuern"}},{id:"https://w3id.org/class/esc/n0412",notation:["0412"],prefLabel:{en:"Finance, banking and insurance",de:"Finanz-, Bank- und Versicherungswesen"}},{id:"https://w3id.org/class/esc/n0413",notation:["0413"],prefLabel:{en:"Management and administration",de:"Geschäftsführung und Verwaltung"}},{id:"https://w3id.org/class/esc/n0414",notation:["0414"],prefLabel:{en:"Marketing and advertising",de:"Marketing und Werbung"}},{id:"https://w3id.org/class/esc/n0415",notation:["0415"],prefLabel:{en:"Secretarial and office work",de:"Büromanagement"}},{id:"https://w3id.org/class/esc/n0416",notation:["0416"],prefLabel:{en:"Wholesale and retail sales",de:"Groß- und Einzelhandel"}},{id:"https://w3id.org/class/esc/n0417",notation:["0417"],prefLabel:{en:"Work skills",de:"Arbeitstechniken"}}]},{id:"https://w3id.org/class/esc/n042",notation:["042","0421"],prefLabel:{en:"Law",de:"Recht"}}]},{id:"https://w3id.org/class/esc/n05",notation:["05"],prefLabel:{en:"Natural sciences, mathematics and statistics",de:"Naturwissenschaften, Mathematik und Statistik"},narrower:[{id:"https://w3id.org/class/esc/n051",notation:["051"],prefLabel:{en:"Biological and related sciences",de:"Biologie und verwandte Wissenschaften"},narrower:[{id:"https://w3id.org/class/esc/n0511",notation:["0511"],prefLabel:{en:"Biology",de:"Biologie"}},{id:"https://w3id.org/class/esc/n0512",notation:["0512"],prefLabel:{en:"Biochemistry",de:"Biochemie"}}]},{id:"https://w3id.org/class/esc/n052",notation:["052"],prefLabel:{en:"Environment",de:"Umwelt"},narrower:[{id:"https://w3id.org/class/esc/n0521",notation:["0521"],prefLabel:{en:"Environmental sciences",de:"Umweltwissenschaften"}},{id:"https://w3id.org/class/esc/n0522",notation:["0522"],prefLabel:{en:"Natural environments and wildlife",de:"Naturschutz und Ökologie"}}]},{id:"https://w3id.org/class/esc/n053",notation:["053"],prefLabel:{en:"Physical sciences",de:"Physikalische Wissenschaften"},narrower:[{id:"https://w3id.org/class/esc/n0531",notation:["0531"],prefLabel:{en:"Chemistry",de:"Chemie"}},{id:"https://w3id.org/class/esc/n0532",notation:["0532"],prefLabel:{en:"Earth sciences",de:"Geowissenschaften"}},{id:"https://w3id.org/class/esc/n0533",notation:["0533"],prefLabel:{en:"Physics",de:"Physik"}}]},{id:"https://w3id.org/class/esc/n054",notation:["054"],prefLabel:{en:"Mathematics and statistics",de:"Mathematik und Statistik"},narrower:[{id:"https://w3id.org/class/esc/n0541",notation:["0541"],prefLabel:{en:"Mathematics",de:"Mathematik"}},{id:"https://w3id.org/class/esc/n0542",notation:["0542"],prefLabel:{en:"Statistics",de:"Statistik"}}]}]},{id:"https://w3id.org/class/esc/n06",notation:["06","061"],prefLabel:{en:"Information and Communication Technologies (ICTs)",de:"Informationstechnik (IT)"},narrower:[{id:"https://w3id.org/class/esc/n0611",notation:["0611"],prefLabel:{en:"Computer use",de:"Computerbenutzung"}},{id:"https://w3id.org/class/esc/n0612",notation:["0612"],prefLabel:{en:"Database and network design and administration",de:"Entwurf und Verwaltung von Datenbanken und Netzwerken"}},{id:"https://w3id.org/class/esc/n0613",notation:["0613"],prefLabel:{en:"Software and applications development and analysis",de:"Software- und Anwendungsentwicklung und -analyse"}}]},{id:"https://w3id.org/class/esc/n07",notation:["07"],prefLabel:{en:"Engineering, manufacturing and construction",de:"Ingenieurwesen, Fertigung und Bauwesen"},narrower:[{id:"https://w3id.org/class/esc/n071",notation:["071"],prefLabel:{en:"Engineering and engineering trades",de:"Ingenieurwesen"},narrower:[{id:"https://w3id.org/class/esc/n0711",notation:["0711"],prefLabel:{en:"Chemical engineering and processes",de:"Chemieingenieurwesen und Verfahrenstechnik"}},{id:"https://w3id.org/class/esc/n0712",notation:["0712"],prefLabel:{en:"Environmental protection technology",de:"Umweltschutztechnik"}},{id:"https://w3id.org/class/esc/n0713",notation:["0713"],prefLabel:{en:"Electricity and energy",de:"Elektrizität und Energieversorgung"}},{id:"https://w3id.org/class/esc/n0714",notation:["0714"],prefLabel:{en:"Electronics and automation",de:"Elektronik und Automatisierung"}},{id:"https://w3id.org/class/esc/n0715",notation:["0715"],prefLabel:{en:"Mechanics and metal trades",de:"Mechanik und Metallverarbeitung"}},{id:"https://w3id.org/class/esc/n0716",notation:["0716"],prefLabel:{en:"Motor vehicles, ships and aircraft",de:"Kraftfahrzeugs-, Schiffs- und Luftfahrttechnik"}}]},{id:"https://w3id.org/class/esc/n072",notation:["072"],prefLabel:{en:"Manufacturing and processing",de:"Produktion und Verarbeitung"},narrower:[{id:"https://w3id.org/class/esc/n0721",notation:["0721"],prefLabel:{en:"Food processing",de:"Nahrungsmittelverarbeitung"}},{id:"https://w3id.org/class/esc/n0722",notation:["0722"],prefLabel:{en:"Materials (glass, paper, plastic and wood)",de:"Materialien (Glas, Papier, Kunststoff und Holz)"}},{id:"https://w3id.org/class/esc/n0723",notation:["0723"],prefLabel:{en:"Textiles (clothes, footwear and leather)",de:"Textilien (Kleidung, Schuhe und Leder)"}},{id:"https://w3id.org/class/esc/n0724",notation:["0724"],prefLabel:{en:"Mining and extraction",de:"Bergbau und Hüttenwesen"}}]},{id:"https://w3id.org/class/esc/n073",notation:["073"],prefLabel:{en:"Architecture and construction",de:"Architektur und Bauwesen"},narrower:[{id:"https://w3id.org/class/esc/n0731",notation:["0731"],prefLabel:{en:"Architecture and town planning",de:"Architektur und Städteplanung"}},{id:"https://w3id.org/class/esc/n0732",notation:["0732"],prefLabel:{en:"Building and civil engineering",de:"Bauingenieurwesen"}}]}]},{id:"https://w3id.org/class/esc/n08",notation:["08"],prefLabel:{en:"Agriculture, forestry, fisheries and veterinary",de:"Land- und Forstwirtschaft, Fischerei und Veterinärmedizin"},narrower:[{id:"https://w3id.org/class/esc/n081",notation:["081"],prefLabel:{en:"Agriculture",de:"Landwirtschaft"},narrower:[{id:"https://w3id.org/class/esc/n0811",notation:["0811"],prefLabel:{en:"Crop and livestock production",de:"Pflanzen- und Tierproduktion"}},{id:"https://w3id.org/class/esc/n0812",notation:["0812"],prefLabel:{en:"Horticulture",de:"Gartenbau"}}]},{id:"https://w3id.org/class/esc/n082",notation:["082","0821"],prefLabel:{en:"Forestry",de:"Forstwirtschaft"}},{id:"https://w3id.org/class/esc/n0831",notation:["083","0831"],prefLabel:{en:"Fisheries",de:"Fischerei"}},{id:"https://w3id.org/class/esc/n0841",notation:["084","0841"],prefLabel:{en:"Veterinary",de:"Veterinärmedizin"}}]},{id:"https://w3id.org/class/esc/n09",notation:["09"],prefLabel:{en:"Health and welfare",de:"Gesundheit und Soziales"},narrower:[{id:"https://w3id.org/class/esc/n091",notation:["091"],prefLabel:{en:"Health",de:"Gesundheit"},narrower:[{id:"https://w3id.org/class/esc/n0911",notation:["0911"],prefLabel:{en:"Dental studies",de:"Zahnmedizin"}},{id:"https://w3id.org/class/esc/n0912",notation:["0912"],prefLabel:{en:"Medicine",de:"Medizin"}},{id:"https://w3id.org/class/esc/n0913",notation:["0913"],prefLabel:{en:"Nursing and midwifery",de:"Krankenpflege und Hebammenwesen"}},{id:"https://w3id.org/class/esc/n0914",notation:["0914"],prefLabel:{en:"Medical diagnostic and treatment technology",de:"Medizinische Diagnostik und Behandlungstechnik"}},{id:"https://w3id.org/class/esc/n0915",notation:["0915"],prefLabel:{en:"Therapy and rehabilitation",de:"Therapie und Rehabilitation"}},{id:"https://w3id.org/class/esc/n0916",notation:["0916"],prefLabel:{en:"Pharmacy",de:"Pharmazie"}},{id:"https://w3id.org/class/esc/n0917",notation:["0917"],prefLabel:{en:"Traditional and complementary medicine and therapy",de:"Traditionelle und komplementärmedizinische Therapie"}}]},{id:"https://w3id.org/class/esc/n092",notation:["092"],prefLabel:{en:"Welfare",de:"Soziales"},narrower:[{id:"https://w3id.org/class/esc/n0921",notation:["0921"],prefLabel:{en:"Care of the elderly and of disabled adults",de:"Altenpflege und Behindertenbetreuung"}},{id:"https://w3id.org/class/esc/n0922",notation:["0922"],prefLabel:{en:"Child care and youth services",de:"Kinderbetreuung und Jugendhilfe"}},{id:"https://w3id.org/class/esc/n0923",notation:["0923"],prefLabel:{en:"Social work and counselling",de:"Soziale Arbeit und Beratung"}}]}]},{id:"https://w3id.org/class/esc/n10",notation:["10"],prefLabel:{en:"Services",de:"Dienstleistungen"},narrower:[{id:"https://w3id.org/class/esc/n101",notation:["101"],prefLabel:{en:"Personal services",de:"Persönliche Dienstleistungen"},narrower:[{id:"https://w3id.org/class/esc/n1011",notation:["1011"],prefLabel:{en:"Domestic services",de:"Haushaltsdienstleistungen"}},{id:"https://w3id.org/class/esc/n1012",notation:["1012"],prefLabel:{en:"Hair and beauty services",de:"Haar- und Schönheitspflege"}},{id:"https://w3id.org/class/esc/n1013",notation:["1013"],prefLabel:{en:"Hotel, restaurants and catering",de:"Hotel- und Gastronomiegewerbe"}},{id:"https://w3id.org/class/esc/n1014",notation:["1014"],prefLabel:{en:"Sports",de:"Sport"}},{id:"https://w3id.org/class/esc/n1015",notation:["1015"],prefLabel:{en:"Travel, tourism and leisure",de:"Reisen, Tourismus und Freizeit"}}]},{id:"https://w3id.org/class/esc/n102",notation:["102"],prefLabel:{en:"Hygiene and occupational health services",de:"Hygiene und Arbeitsmedizinische Dienste"},narrower:[{id:"https://w3id.org/class/esc/n1021",notation:["1021"],prefLabel:{en:"Community sanitation",de:"Siedlungswasserwirtschaft"}},{id:"https://w3id.org/class/esc/n1022",notation:["1022"],prefLabel:{en:"Occupational health and safety",de:"Arbeitssicherheit und Gesundheitsschutz"}}]},{id:"https://w3id.org/class/esc/n103",notation:["103"],prefLabel:{en:"Security services",de:"Sicherheitsdienstleistungen"},narrower:[{id:"https://w3id.org/class/esc/n1031",notation:["1031"],prefLabel:{en:"Military and defence",de:"Militär und Verteidigung"}},{id:"https://w3id.org/class/esc/n1032",notation:["1032"],prefLabel:{en:"Protection of persons and property",de:"Personen- und Objektschutz"}}]},{id:"https://w3id.org/class/esc/n104",notation:["104","1041"],prefLabel:{en:"Transport services",de:"Transportwesen"}}]}],"@context":{"@version":1.1,id:"@id",type:"@type","@vocab":"http://www.w3.org/2004/02/skos/core#",xsd:"http://www.w3.org/2001/XMLSchema#",dct:"http://purl.org/dc/terms/",schema:"http://schema.org/",vann:"http://purl.org/vocab/vann/",as:"https://www.w3.org/ns/activitystreams#",ldp:"http://www.w3.org/ns/ldp#",title:{"@id":"dct:title","@container":"@language"},description:{"@id":"dct:description","@container":"@language"},issued:{"@id":"dct:issued","@type":"xsd:date"},created:{"@id":"dct:created","@type":"xsd:date"},modified:{"@id":"dct:modified","@type":"xsd:date"},creator:"dct:creator",publisher:"dct:publisher",preferredNamespacePrefix:"vann:preferredNamespacePrefix",preferredNamespaceUri:"vann:preferredNamespaceUri",isBasedOn:"schema:isBasedOn",source:"dct:source",prefLabel:{"@container":"@language"},altLabel:{"@container":["@language","@set"]},definition:{"@container":"@language"},scopeNote:{"@container":"@language"},note:{"@container":"@language"},notation:{"@container":"@set"},narrower:{"@container":"@set"},narrowerTransitive:{"@container":"@set"},broaderTransitive:{"@container":"@set"},followers:"as:followers",inbox:"ldp:inbox"}}

const n003data = {
  id: "https://w3id.org/class/esc/n003",
  type: "Concept",
  followers: "https://skohub.io/followers?subject=hbz%2Fvocabs-edu%2Fheads%2Fmaster%2Fw3id.org%2Fclass%2Fesc%2Fn003",
  inbox: "https://skohub.io/inbox?actor=hbz%2Fvocabs-edu%2Fheads%2Fmaster%2Fw3id.org%2Fclass%2Fesc%2Fn003",
  prefLabel: {
    en: "Personal skills and development",
    de: "Persönliche Fähigkeiten und Entwicklung",
  },
  notation: [
    "003",
    "0031",
  ],
  broader: {
    id: "https://w3id.org/class/esc/n00",
    prefLabel: {
      en: "Generic programmes and qualifications",
      de: "Allgemeine Programme und Qualifikationen",
    },
  },
  inScheme: {
    id: "https://w3id.org/class/esc/scheme",
    title: {
      en: "Educational Subjects Classification",
    },
  },
  "@context": {
    "@version": 1.1,
    id: "@id",
    type: "@type",
    "@vocab": "http://www.w3.org/2004/02/skos/core#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    dct: "http://purl.org/dc/terms/",
    schema: "http://schema.org/",
    vann: "http://purl.org/vocab/vann/",
    as: "https://www.w3.org/ns/activitystreams#",
    ldp: "http://www.w3.org/ns/ldp#",
    title: {
      "@id": "dct:title",
      "@container": "@language",
    },
    description: {
      "@id": "dct:description",
      "@container": "@language",
    },
    issued: {
      "@id": "dct:issued",
      "@type": "xsd:date",
    },
    created: {
      "@id": "dct:created",
      "@type": "xsd:date",
    },
    modified: {
      "@id": "dct:modified",
      "@type": "xsd:date",
    },
    creator: "dct:creator",
    publisher: "dct:publisher",
    preferredNamespacePrefix: "vann:preferredNamespacePrefix",
    preferredNamespaceUri: "vann:preferredNamespaceUri",
    isBasedOn: "schema:isBasedOn",
    source: "dct:source",
    prefLabel: {
      "@container": "@language",
    },
    altLabel: {
      "@container": [
        "@language",
        "@set",
      ],
    },
    definition: {
      "@container": "@language",
    },
    scopeNote: {
      "@container": "@language",
    },
    note: {
      "@container": "@language",
    },
    notation: {
      "@container": "@set",
    },
    narrower: {
      "@container": "@set",
    },
    narrowerTransitive: {
      "@container": "@set",
    },
    broaderTransitive: {
      "@container": "@set",
    },
    followers: "as:followers",
    inbox: "ldp:inbox",
  },
}

describe("SkohubProvider", () => {

  beforeEach(() => {
    mock.resetHandlers()
  })

  it("should load scheme details", async () => {
    mock.onGet().reply(200, schemeData)
    const schemes = await registry.getSchemes()

    assert.equal(schemes.length, 1)
    assert.deepEqual(schemes[0].prefLabel, { en: "Educational Subjects Classification" })
  })

  // TODO: Removing this test for now because top concepts are missing data and therefore are not loaded into cache by default.
  // it("should have loaded top concepts", async () => {
  //   const topConcepts = await registry.getTop({scheme})

  //   assert.equal(topConcepts.length, 11)

  //   const inScheme = { inScheme: [scheme] }
  //   const concepts = [{ uri: "https://w3id.org/class/esc/n01", ...inScheme }, { uri: "not:found", ...inScheme }]
  //   const response = await registry.getConcepts({concepts})
  //   assert.equal(response.length, 1)
  // })

  it("should load additional concepts", async () => {
    mock.onGet().reply(200, n003data)

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
