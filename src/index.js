/**
 * @module cocoda-sdk
 */

import CocodaSDK from "./lib/CocodaSDK.js"
import * as errors from "./errors/index.js"
export * from "./providers/index.js"

import * as providers from "./providers/index.js"

// Create and export a default instance
const cdk = new CocodaSDK()

export {
  cdk,          // Default CocodaSDK instance
  CocodaSDK,    // CocodaSDK class (to create new instances or checks with `instanceof`)
  errors,
  providers,
}

/**
 * Adds all available providers to a CocodaSDK instance.
 *
 * @param {CocodaSDK} [_cdk] CocodaSDK instance to which to add the providers (defaults to default instance)
 */
export function addAllProviders(_cdk) {
  Object.values(providers).forEach(provider => (_cdk || cdk).addProvider(provider))
}
