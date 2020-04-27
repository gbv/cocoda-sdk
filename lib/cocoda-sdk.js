const providers = require("../providers")
const utils = require("../utils")
const jskos = require("jskos-tools")

function createInstance({ config } = {}) {

  function cdk({ config }) {
    cdk.config = config
    return cdk
  }

  // Define getter/setter for config
  Object.defineProperties(cdk, {
    config: {
      get() {
        return this._config
      },
      set(config = {}) {
        // Preparations for config
        // 1. Make sure config.registries exists
        config.registries = config.registries || []
        // 2. Create a provider for all registries
        for (let registry of config.registries) {
          // Replace provider with provider object
          try {
            registry.provider = new providers[registry.provider]({ registry })
          } catch(error) {
            registry.provider = null
          }
        }
        // 3. Remove all registries without provider
        config.registries = config.registries.filter(registry => registry.provider != null)
        // 4. Call setRegistries for registries if available
        for (let registry of config.registries.filter(r => r.provider.setRegistries)) {
          registry.provider.setRegistries(config.registries)
        }
        // ...
        this._config = config
      },
    },
  })

  // Define request methods with registry parameter on cdk
  for (let method of utils.requestMethods) {
    cdk[method] = ({ registry, ...config }) => {
      // Make sure registry is from our config
      registry = cdk._config.registries.find(r => jskos.compare(r, registry))
      if (!registry) {
        throw new Error("registry is needed for request")
      }
      return registry.provider[method](config)
    }
  }

  // Properties
  cdk.config = config

  // Also offer createInstance method
  cdk.createInstance = createInstance

  return cdk
}

module.exports = createInstance
