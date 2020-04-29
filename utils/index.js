const requestMethods = [
  // General
  {
    method: "getRegistries",
    fallback: [],
  },
  {
    method: "getSchemes",
    fallback: [],
  },
  {
    method: "getTypes",
    fallback: [],
  },
  {
    method: "suggest",
    fallback: ["", [], [], []],
  },
  {
    method: "getConcordances",
    fallback: [],
  },
  {
    method: "getOccurrences",
    fallback: [],
  },
  // Concepts
  {
    method: "getTop",
    fallback: [],
  },
  {
    method: "getConcepts",
    fallback: [],
  },
  {
    method: "getConcept",
    fallback: null,
  },
  {
    method: "getNarrower",
    fallback: [],
  },
  {
    method: "getAncestors",
    fallback: [],
  },
  {
    method: "search",
    fallback: [],
  },
  // Mappings
  {
    method: "getMapping",
    fallback: null,
  },
  {
    method: "getMappings",
    fallback: [],
  },
  {
    method: "postMapping",
    fallback: null,
  },
  {
    method: "postMappings",
    fallback: [],
  },
  {
    method: "putMapping",
    fallback: null,
  },
  {
    method: "patchMapping",
    fallback: null,
  },
  {
    method: "deleteMapping",
    fallback: false,
  },
  {
    method: "deleteMappings",
    fallback: [],
  },
  // Annotations
  // {
  //   method: "getAnnotation",
  //   fallback: "",
  // },
  {
    method: "getAnnotations",
    fallback: [],
  },
  {
    method: "postAnnotation",
    fallback: null,
  },
  {
    method: "putAnnotation",
    fallback: null,
  },
  {
    method: "patchAnnotation",
    fallback: null,
  },
  {
    method: "deleteAnnotation",
    fallback: false,
  },
]

module.exports = {
  requestMethods,
}
