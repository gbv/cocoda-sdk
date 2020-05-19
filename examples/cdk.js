const cdk = require("../index")

/**
 * Get a cdk instances and load config from dev config.
 *
 * Exported as Promise:
 * ```js
 *  const cdk = await require("./cdk")
 * ```
 */
module.exports = (async (url = "https://coli-conc.gbv.de/cocoda/dev/cocoda.json") => {
  await cdk.loadConfig(url)
  return cdk
})()
