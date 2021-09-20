import CocodaSDK from "./lib/CocodaSDK.js"
import * as errors from "./errors/index.js"
export * from "./providers/index.js"

// Create and export a default instance
const cdk = new CocodaSDK()

export {
  cdk,
  CocodaSDK,
  errors,
}