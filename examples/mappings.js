(async () => {
  let result

  const cdk = await require("./cdk")

  // Get dev mapping registry
  const registry = cdk.getRegistryForUri("http://coli-conc.gbv.de/registry/coli-conc-mappings-dev")

  // Get 10 mappings
  // Way 1:
  result = await cdk.getMappings({ registry, limit: 10 })
  console.log(result.length)
  // Way 2:
  result = await registry.getMappings({ limit: 10 })
  console.log(result.length)

  // Repeatedly request mappings
  console.log("Repeatedly requesting mappings.")
  console.log("Create or delete mapping via https://coli-conc.gbv.de/cocoda/dev/ to see change.")
  console.log("Press ctrl+c to stop.")
  // Method returns a cancel function
  const cancel = cdk.repeat({
    registry,
    method: "getMappings",
    interval: 3000,
    callback: (mappings, error) => {
      if (error) {
        console.error(error)
      } else {
        console.log("- mappings changed:", mappings.length)
      }
    },
  })

  process.on("SIGINT", () => {
    console.log("Stopping...")
    cancel()
    // Not calling process.exit because it should exit anyway after the interval is cleared.
  })

})()
