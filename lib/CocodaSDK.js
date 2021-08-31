const providers = require("../providers")
const errors = require("../errors")
const axios = require("axios")
const _ = require("../utils/lodash")
const jskos = require("jskos-tools")

class CocodaSDK {

  /**
   * CDK constructor.
   *
   * @param {Object} [config={}] Cocoda-stye config object
   */
  constructor(config) {
    this.config = config
    this.axios = axios.create()
  }

  /**
   * Method to set the configuration.
   *
   * @param {Object} config Cocoda-stye config object
   */
  setConfig(config) {
    this.config = config
  }

  /**
   * Current configuration.
   *
   * @returns {Object} current configuration
   */
  get config() {
    return this._config
  }

  /**
   * Prepares config when set.
   *
   * @param {Object} config Cocoda config object
   * @private
   */
  set config(config) {
    config = config || {}
    // Preparations for config
    // 1. Make sure config.registries exists
    config.registries = config.registries || []
    // 2. Initialize registries
    config.registries = config.registries.map(registry => providers.init(registry)).filter(r => r)
    // 3. Call setRegistries for registries if available
    for (let registry of config.registries.filter(r => r.setRegistries)) {
      registry.setRegistries(config.registries)
    }
    this._config = config
  }

  /**
   * Array of registered providers. Especially useful for implementating custom providers:
   *
   * class CustomProvider extends cdk.providers.Base {
   *   // ...
   * }
   *
   * @returns {Array} array of registered providers
   */
  get providers() {
    return providers
  }

  /**
   * Creates a new CDK instance (same as `new CocodaSDK(config)`).
   *
   * @param {Object} config Cocoda config object
   * @returns {CocodaSDK} new CDK instance
   */
  createInstance(config) {
    return new CocodaSDK(config)
  }

  /**
   * Offer method to load a config file from URL.
   *
   * @param {string} url URL of config as JSON
   */
  async loadConfig(url) {
    const response = await this.axios.get(url)
    this.config = response.data
  }

  /**
   * Method to load buildInfo.
   *
   * Callback will only be called if buildInfo changes; it will not be called when there is no previous value.
   *
   * @param {Object} config
   * @param {string} [config.url] full URL for build-info.json (default is taken from config.cocodaBaseUrl)
   * @param {Object} [config.buildInfo] current buildInfo
   * @param {number} [config.interval=60000] interval to load buildInfo in ms
   * @param {Function} config.callback callback function called with two parameters (error, buildInfo, previousBuildInfo)
   * @returns {Object} object with two function properties, `stop` to cancel the repeating request, `start` to restart the repeating request, as well as three convenience properties, `isPaused` (whether it is currently paused), `lastResult`, `hasErrored` (whether the last call of the function has errored)
   */
  loadBuildInfo({ url, buildInfo = null, interval = 60000, callback, ...config }) {
    if (!url && !this.config.cocodaBaseUrl) {
      throw new errors.CDKError({ message: "Could not determine URL to load build config." })
    }
    if (!url) {
      url = `${this.config.cocodaBaseUrl}build-info.json`
    }
    return this.repeat({
      ...config,
      function: async () => {
        return (await this.axios.get(url, {
          headers: {
            "Cache-Control": "no-cache",
          },
        })).data
      },
      interval,
      callback: (error, result, previousResult) => {
        if (error) {
          callback(error)
        } else if (previousResult || (!previousResult && buildInfo && !_.isEqual(result, buildInfo))) {
          callback(null, result, previousResult || buildInfo)
        }
      },
    })
  }

  /**
   * Method to get a registry by URI.
   *
   * @param {string} uri URI of registry in config
   * @returns {?Object} initialized registry from config if found
   */
  getRegistryForUri(uri) {
    return this.config.registries.find(r => r.uri == uri)
  }

  /**
   * Method to initialize registry.
   *
   * @param {Object} registry JSKOS registry object
   * @returns {Object} initialized registry
   */
  initializeRegistry(registry) {
    return providers.init(registry)
  }

  /**
   * Method to add custom provider.
   *
   * @param {Object} provider provider class that extends BaseProvider
   */
  addProvider(provider) {
    providers.addProvider(provider)
  }

  /**
   * Repeatedly call a certain function.
   *
   * Notes:
   * - Callback will only be called if the results were changed.
   * - The function will only be repeated after the previous call is resolved. This means that the total interval duration is (interval + duration of function call).
   *
   * Example:
   * ```js
   *  cdk.repeat({
   *    function: () => registry.getMappings(),
   *    callback: (error, result) => console.log(result),
   *  })
   * ```
   *
   * @param {Object} config
   * @param {string} config.function a function to be called (can be async)
   * @param {number} [config.interval=15000] interval in ms
   * @param {Function} config.callback callback function called with two parameters (error, result, previousResult)
   * @param {boolean} [config.callImmediately=true] whether to call the function immediately
   * @returns {Object} object with two function properties, `stop` to cancel the repeating request, `start` to restart the repeating request, as well as three convenience properties, `isPaused` (whether it is currently paused), `lastResult`, `hasErrored` (whether the last call of the function has errored)
   */
  repeat({ function: func, interval = 15000, callback, callImmediately = true } = {}) {
    // Check parameters
    // ? Are these thorough checks really necessary?
    if (!func) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "function" })
    }
    if (typeof func != "function") {
      throw new errors.InvalidOrMissingParameterError({ parameter: "function", message: "function needs to be a function" })
    }
    // Wrap function so that it will definitely be async
    const asyncFunc = async () => func()
    interval = parseInt(interval)
    if (isNaN(interval)) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "interval" })
    }
    if (!callback) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "callback" })
    }
    if (typeof callback != "function") {
      throw new errors.InvalidOrMissingParameterError({ parameter: "callback", message: "callback needs to be a function" })
    }
    // Prepare repeat cache
    let repeat = {
      timer: null,
      result: null,
      error: null,
      isPaused: false,
    }
    // Functions to handle results and errors
    const handleResult = (result) => {
      const previousResult = repeat.result
      if (!_.isEqual(previousResult, result)) {
        repeat.result = result
        repeat.error = null
        callback(null, result, previousResult)
      }
    }
    const handleError = (error) => {
      repeat.error = error
      callback(error)
    }
    // Method to call a method after timeout if necessary
    const repeatIfNecessary = toCall => {
      if (repeat.isPaused) {
        return
      }
      repeat.timer = setTimeout(() => {
        toCall()
      }, interval)
    }
    // Method to call the function, handle result/error, and repeat if necessary
    const call = () => asyncFunc().then(handleResult).catch(handleError).then(() => repeatIfNecessary(call))
    // Method to set up the repeating call (skip initial call if necessary)
    const setup = (_callImmediately = callImmediately) => {
      if (_callImmediately) {
        call()
      } else {
        repeatIfNecessary(call)
      }
    }
    // Set up
    setup()
    // Return object with methods to start/stop the interval and an indicator whether it is paused
    return {
      start: (...params) => {
        repeat.isPaused = false
        setup(...params)
      },
      stop: () => {
        repeat.isPaused = true
        // If timer is available, clear immediately, if not, wait for one interval
        if (repeat.timer) {
          clearTimeout(repeat.timer)
        } else {
          setTimeout(() => {
            repeat.timer && clearTimeout(repeat.timer)
          }, interval)
        }
      },
      get isPaused() {
        return repeat.isPaused
      },
      get lastResult() {
        return repeat.result
      },
      get hasErrored() {
        return !!repeat.error
      },
    }
  }

  /**
   * Gets schemes from all registries that support schemes and merges the results.
   *
   * @param {Object} [config={}] configuration object that will be used as a parameter for internal `getSchemes` calls
   * @returns {Object[]} array of JSKOS schemes
   */
  async getSchemes(config = {}) {
    let schemes = [], promises = []

    for (let registry of this.config.registries) {
      if (registry.has.schemes) {
        let promise = registry.getSchemes(config).then(results => {
          for (let scheme of results) {
            // Add scheme specific custom properties
            scheme.__DETAILSLOADED__ = 1
            scheme.type = scheme.type || ["http://www.w3.org/2004/02/skos/core#ConceptScheme"]
            // Check if scheme is already loaded
            let otherScheme = schemes.find(s => jskos.compare(s, scheme)), prio, otherPrio, override = false
            if (otherScheme) {
              // Set priorities as index of registry array
              prio = this.config.registries.indexOf(registry)
              if (prio != -1) {
                prio = this.config.registries.length - prio
              }
              otherPrio = this.config.registries.indexOf(_.get(otherScheme, "_registry"))
              if (otherPrio != -1) {
                otherPrio = this.config.registries.length - otherPrio
              }
              let currentHasConcepts = !scheme.concepts ? 0 : (scheme.concepts.length == 0 ? -1 : 1)
              let otherHasConcepts = !otherScheme.concepts ? 0 : (otherScheme.concepts.length == 0 ? -1 : 1)
              // Use existence of concepts first, priority second
              if (currentHasConcepts > otherHasConcepts) {
                override = true
              } else if (currentHasConcepts < otherHasConcepts) {
                override = false
              } else {
                override = otherPrio < prio
              }
            }
            if (!otherScheme || override) {
              if (override) {
                // Find and remove scheme from schemes array
                let otherSchemeIndex = schemes.findIndex(s => jskos.compare(s, otherScheme))
                if (otherSchemeIndex != -1) {
                  schemes.splice(otherSchemeIndex, 1)
                }
                // Integrate details from existing scheme
                scheme = jskos.merge(scheme, otherScheme, { mergeUris: true, skipPaths: ["_registry"] })
              }
              scheme._registry = registry
              // Save scheme in objects and push into schemes array
              schemes.push(scheme)
            } else {
              // Integrate details into existing scheme
              let index = schemes.findIndex(s => jskos.compare(s, scheme))
              if (index != -1) {
                let registry = schemes[index]._registry
                schemes[index] = jskos.merge(schemes[index], _.omit(scheme, ["concepts", "topConcepts"]), { mergeUris: true, skipPaths: ["_registry"] })
                schemes[index]._registry = registry
              }
            }
          }
        }).catch(error => {
          // TODO
          console.warn("Couldn't load schemes for registry", registry.uri, error)
        })
        promises.push(promise)
      }
    }

    return Promise.all(promises).then(() => {
      // Remove certain properties from objects
      // ? Why?
      for (let scheme of schemes) {
        if (scheme.concepts && scheme.concepts.length == 0) {
          delete scheme.concepts
        }
        if (scheme.topConcepts && scheme.topConcepts.length == 0) {
          delete scheme.topConcepts
        }
      }
      schemes = schemes.filter(scheme => scheme != null)
      schemes = jskos.sortSchemes(schemes)
      return schemes
    })
  }

}

module.exports = CocodaSDK
