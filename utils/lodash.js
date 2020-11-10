// Exports a subset of lodash methods

module.exports = {
  get: require("lodash/get"),
  set: require("lodash/set"),
  uniq: require("lodash/uniq"),
  intersection: require("lodash/intersection"),
  union: require("lodash/union"),
  unionWith: require("lodash/unionWith"),
  forOwn: require("lodash/forOwn"),
  // TOOD: Use Array.isArray instead
  isArray: require("lodash/isArray"),
  isObject: require("lodash/isObject"),
  isString: require("lodash/isString"),
  isEmpty: require("lodash/isEmpty"),
  isEqual: require("lodash/isEqual"),
  merge: require("lodash/merge"),
  last: require("lodash/last"),
  omit: require("lodash/omit"),
  // TODO: Use native concat instead
  concat: require("lodash/concat"),
}
