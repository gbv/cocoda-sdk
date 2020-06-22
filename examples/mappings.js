(async () => {
  let result

  const cdk = await require("./cdk")

  // Get dev mapping registry
  const registry = cdk.getRegistryForUri("http://coli-conc.gbv.de/registry/coli-conc-mappings-dev")

  // Get 10 mappings
  result = await registry.getMappings({ limit: 10 })
  console.log(result.length)

  // Repeatedly request mappings
  console.log("Repeatedly requesting mappings.")
  console.log("Create or delete mapping via https://coli-conc.gbv.de/cocoda/dev/ to see change.")
  console.log("Press ctrl+c to stop.")
  // Method returns a cancel function
  const repeat = cdk.repeat({
    function: () => registry.getMappings(),
    interval: 2000,
    callback: (error, mappings, previousMappings) => {
      if (error) {
        console.error(error)
      } else {
        console.log("- mappings changed:", mappings.length, "previously:", previousMappings ? previousMappings.length : "?")
      }
    },
  })
  console.log(repeat)

  let lastSignal
  let interval
  process.on("SIGINT", () => {
    const time = new Date()
    if (lastSignal && time - lastSignal < 1000) {
      // Stopping when sent twice in a row
      console.log("Stopping...")
      repeat.stop()
      interval && clearInterval(interval)
      // Not calling process.exit because it should exit anyway after the interval is cleared.
    } else {
      lastSignal = time
      // Otherwise pause/resume
      if (repeat.isPaused) {
        console.log("Unpausing...")
        repeat.start()
        interval && clearInterval(interval)
      } else {
        console.log("Pausing...")
        repeat.stop()
        // Add an interval so that the process doesn't stop
        interval = setInterval(() => {
          console.log(repeat)
        }, 10000)
      }
    }
  })

})()
