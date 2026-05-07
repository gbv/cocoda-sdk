// TODO: move to base-provider

export const requestMethods = [
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
    method: "vocSearch",
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
    method: "vocSuggest",
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

export function concatUrl(...parts) {
  let [url, ...otherParts] = parts
  for (let part of otherParts) {
    if (!url.endsWith("/")) {
      url += "/"
    }
    if (part.startsWith("/")) {
      part = part.slice(1)
    }
    url += part
  }
  return url
}


// Retain custom array properties
export function withCustomProps(arr, from) {
  arr._totalCount = from._totalCount
  arr._url = from._url
  return arr
}

export const listOfCapabilities = [
  "registries",
  "schemes",
  "top",
  "data",
  "concepts",
  "narrower",
  "ancestors",
  "types",
  "suggest",
  "search",
  "auth",
  "mappings",
  "concordances",
  "annotations",
  "occurrences",
]

// not available in browser so we can't use node:util
export const deepEqual = (a,b) => {
    
  // same primitive
  if (a === b) { 
    return true 
  }

  // must be array or object but not null
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null ) {
    return false
  }

  // keys / array members
  if (Object.keys(a).length === Object.keys(b).length) {
    for (let key in a) {
      if (!(key in b)) {
        return false
      }
      if (!deepEqual(a[key], b[key])) {
        return false
      }
    }
    return true
  }

  return false
}
