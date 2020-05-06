const cdk = require("../index")

/**
 * Get a cdk instances and load config from dev config.
 *
 * Exported as Promise:
 * ```js
 *  const cdk = await require("./cdk")
 * ```
 */
module.exports = (async (url = "https://raw.githubusercontent.com/gbv/cocoda/dev/config/cocoda.dev.json") => {
  await cdk.loadConfig(url)
  return cdk
})()
