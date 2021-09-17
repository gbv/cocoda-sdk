// Exports a subset of lodash methods

import lodash from "lodash"

export const get = lodash.get
export const set = lodash.set
export const uniq = lodash.uniq
export const intersection = lodash.intersection
export const union = lodash.union
export const forOwn = lodash.forOwn
// TOOD: Use Array.isArray instead
export const isArray = lodash.isArray
export const isObject = lodash.isObject
export const isString = lodash.isString
export const isEmpty = lodash.isEmpty
export const isEqual = lodash.isEqual
export const merge = lodash.merge
export const last = lodash.last
export const omit = lodash.omit
// TODO: Use native concat instead
export const concat = lodash.concat
