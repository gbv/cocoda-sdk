import CDK from "./lib/CocodaSDK.js"
import * as errors from "./errors/index.js"
import { providers } from "./providers/index.js"

// Create and export a default instance
const cdk = new CDK()

// TODO: Deal differently with providers
export {
  cdk,
  errors,
  providers,
}
