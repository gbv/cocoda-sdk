const providers = require("../providers")
const utils = require("../utils")
const jskos = require("jskos-tools")
const errors = require("../errors")
const axios = require("axios")

/**
 * Creates a new cdk instance.
 *
 * @param {*} options
 * @param {Object} options.config Cocoda config object
 * @param {boolean} options._throw option whether errors should be thrown or fallback values should be return (default: true)
 *
 * @returns {Object|Function} returns a cdk instance that can also be called as a function for configuration
 */
function createInstance(options = {}) {

  /**
   * Sets options for the current cdk instance.
   *
   * @param {*} options
   * @param {Object} options.config Cocoda config object
   * @param {boolean} options._throw option whether errors should be thrown or fallback values should be return (default: true)
   */
  function cdk({ config, _throw = true } = {}) {
    cdk.config = config
    cdk._throw = _throw
    return cdk
  }

  // Define getter/setter for config
  Object.defineProperties(cdk, {
    config: {
      get() {
        return this._config
      },
      /**
       * Prepares config when set.
       *
       * @param {Object} config Cocoda config object
       */
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
  const additionalMethods = [
    {
      method: "repeat",
    },
  ]
  for (let { method, fallback } of utils.requestMethods.concat(additionalMethods)) {
    cdk[method] = ({ registry, _throw = cdk._throw, ...config }) => {
      // Make sure registry is from our config
      registry = cdk._config.registries.find(r => jskos.compare(r, registry))
      if (!registry) {
        throw new errors.MissingRegistryError()
      }
      try {
        return registry.provider[method](config)
      } catch(error) {
        // Depending on config property `_throw`, either throw the error or return the fallback
        if (_throw) {
          throw error
        } else {
          return fallback
        }
      }
    }
  }

  // Set options
  cdk(options)

  // Also offer createInstance method
  cdk.createInstance = createInstance

  // Offer method to load a config file from URL
  cdk.loadConfig = async (url) => {
    const response = await axios.get(url)
    cdk.config = response.data
  }

  return cdk
}

module.exports = createInstance
