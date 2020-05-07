const providers = require("../providers")
const utils = require("../utils")
const jskos = require("jskos-tools")
const errors = require("../errors")
const axios = require("axios")
const _ = require("../utils/lodash")

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
        // 2. Initialize registries
        config.registries = config.registries.map(registry => {
          try {
            return providers.init(registry)
          } catch(error) {
            if (cdk._throw) {
              throw error
            }
            return null
          }
        }).filter(r => r)
        // 3. Call setRegistries for registries if available
        for (let registry of config.registries.filter(r => r.setRegistries)) {
          registry.setRegistries(config.registries)
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
        return registry[method](config)
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

  /**
   * Method to load buildInfo.
   *
   * Callback will only be called if buildInfo changes (note: even if it changes from `null`). An error will be added as a second parameter, in that case the first parameter will contain the previous buildInfo.
   *
   * @param {Object} config
   * @param {string} [config.url] full URL for build-info.json (default is taken from config.cocodaBaseUrl)
   * @param {Object} [config.buildInfo] current buildInfo
   * @param {number} [config.interval=60000] interval to load buildInfo in ms
   * @param {Function} config.callback callback function called with two parameters (buildInfo, error)
   */
  cdk.loadBuildInfo = ({ url, buildInfo = null, interval = 60000, callback }) => {
    if (!url && !cdk.config.cocodaBaseUrl) {
      throw new errors.CDKError({ message: "Could not determine URL to load build config." })
    }
    if (!url) {
      url = `${cdk.config.cocodaBaseUrl}build-info.json`
    }
    const timer = setInterval(async () => {
      try {
        const response = await axios.get(url)
        if (!_.isEqual(buildInfo, response.data)) {
          callback(response.data)
        }
        buildInfo = response.data
      } catch(error) {
        callback(buildInfo, error)
      }
    }, interval)
    return () => {
      clearInterval(timer)
    }
  }

  // Method to get a registry by URI
  cdk.getRegistryForUri = (uri) => cdk.config.registries.find(r => r.uri == uri)

  // Method to initialize registry
  cdk.initializeRegistry = (registry) => providers.init(registry)

  // Method to add custom provider
  cdk.addProvider = (provider) => providers.addProvider(provider)

  return cdk
}

module.exports = createInstance
