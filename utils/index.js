const requestMethods = [
  // General
  {
    method: "getRegistries",
    fallback: [],
    type: "Registries",
  },
  {
    method: "getSchemes",
    fallback: [],
    type: "Schemes",
  },
  {
    method: "getTypes",
    fallback: [],
    type: "Types",
  },
  {
    method: "suggest",
    fallback: ["", [], [], []],
  },
  {
    method: "getConcordances",
    fallback: [],
    type: "Concordances",
  },
  {
    method: "getOccurrences",
    fallback: [],
    type: "Occurrences",
  },
  // Concepts
  {
    method: "getTop",
    fallback: [],
    type: "Concepts",
  },
  {
    method: "getConcepts",
    fallback: [],
    type: "Concepts",
  },
  {
    method: "getConcept",
    fallback: null,
    type: "Concept",
  },
  {
    method: "getNarrower",
    fallback: [],
    type: "Concepts",
  },
  {
    method: "getAncestors",
    fallback: [],
    type: "Concepts",
  },
  {
    method: "search",
    fallback: [],
    type: "Concepts",
  },
  // Mappings
  {
    method: "getMapping",
    fallback: null,
    type: "Mapping",
  },
  {
    method: "getMappings",
    fallback: [],
    type: "Mappings",
  },
  {
    method: "postMapping",
    fallback: null,
    type: "Mapping",
  },
  {
    method: "postMappings",
    fallback: [],
    type: "Mapping",
  },
  {
    method: "putMapping",
    fallback: null,
    type: "Mapping",
  },
  {
    method: "patchMapping",
    fallback: null,
    type: "Mapping",
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
    type: "Annotations",
  },
  {
    method: "postAnnotation",
    fallback: null,
    type: "Annotation",
  },
  {
    method: "putAnnotation",
    fallback: null,
    type: "Annotation",
  },
  {
    method: "patchAnnotation",
    fallback: null,
    type: "Annotation",
  },
  {
    method: "deleteAnnotation",
    fallback: false,
  },
]

module.exports = {
  requestMethods,
}