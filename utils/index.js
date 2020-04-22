const requestMethods = [
  // General
  "getRegistries",
  "getSchemes",
  "getTypes",
  "suggest",
  "getConcordances",
  "getOccurrences",
  // Concepts
  "getTop",
  "getConcepts",
  "getConcept",
  "getNarrower",
  "getAncestors",
  "search",
  // Mappings
  "getMapping",
  "getMappings",
  "postMapping",
  "postMappings",
  "putMapping",
  "patchMapping",
  "deleteMapping",
  "deleteMappings",
  // Annotations
  // "getAnnotation",
  "getAnnotations",
  "postAnnotation",
  "putAnnotation",
  "patchAnnotation",
  "deleteAnnotation",
]

module.exports = {
  requestMethods,
}
