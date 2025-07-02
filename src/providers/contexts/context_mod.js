export const context_mod = {
  "@context": {
    iri: "@id",
    subject: "http://purl.org/dc/terms/subject",
    language: "http://purl.org/dc/terms/language",
    source: "http://purl.org/dc/terms/source",
    type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    descriptions: {
      "@id": "http://www.w3.org/2004/02/skos/core#definition",
      "@container": "@set",
    },
    source_url: "http://www.w3.org/ns/dcat#accessURL",
    contributor: "http://purl.org/dc/terms/contributor",
    modified: {
      "@id": "http://purl.org/dc/terms/modified",
      "@type": "xsd:date",
    },
    identifier: "http://purl.org/dc/terms/identifier",
    hasFormat: "http://purl.org/dc/terms/format",
    creator: "http://purl.org/dc/terms/creator",
    created: {
      "@id": "http://purl.org/dc/terms/created",
      "@type": "xsd:date",
    },
    landingPage: "http://xmlns.com/foaf/0.1/page",
    label: "http://www.w3.org/2004/02/skos/core#prefLabel",
    version: "http://www.w3.org/2002/07/owl#versionInfo",
    license: "http://purl.org/dc/terms/license",
    short_form: "http://www.w3.org/2004/02/skos/core#notation",
    publisher: "http://purl.org/dc/terms/publisher",
    source_name: "http://www.w3.org/2004/02/skos/core#notation",
  },
}
export default context_mod
