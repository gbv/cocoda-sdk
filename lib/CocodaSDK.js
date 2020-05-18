const providers = require("../providers")
const errors = require("../errors")
const axios = require("axios")
const _ = require("../utils/lodash")

class CocodaSDK {

  /**
   * CDK constructor.
   *
   * @param {Object} [config={}] Cocoda-stye config object
   */
  constructor(config) {
    this.config = config
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
    const response = await axios.get(url)
    this.config = response.data
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
   * @returns {Function} function to clear interval
   */
  loadBuildInfo({ url, buildInfo = null, interval = 60000, callback }) {
    if (!url && !this.config.cocodaBaseUrl) {
      throw new errors.CDKError({ message: "Could not determine URL to load build config." })
    }
    if (!url) {
      url = `${this.config.cocodaBaseUrl}build-info.json`
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
   * Callback will only be called if the results were changed.
   *
   * Example:
   * ```js
   *  cdk.repeat({
   *    function: () => registry.getMappings(),
   *    callback: (error, result) => console.log(result),
   *    limit: 3,
   *    offset: 3,
   *  })
   * ```
   *
   * @param {Object} config
   * @param {string} config.function a function to be called (can be async)
   * @param {number} [config.interval=15000] interval in ms
   * @param {Function} config.callback callback function called with two parameters (error, result, previousResult)
   * @returns {Function} function to cancel the repeating request
   */
  repeat({ function: func, interval = 15000, callback } = {}) {
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
    }
    // Functions to handle results and errors
    const handleResult = (result) => {
      if (!_.isEqual(repeat.result, result)) {
        callback(null, result, repeat.result)
        repeat.result = result
      }
    }
    const handleError = (error) => {
      callback(error)
    }
    // Call method once immediately
    asyncFunc()
      .then(result => [result])
      .catch(error => [null, error])
      .then(([result, error]) => {
        // Handle result/error once
        if (!error) {
          handleResult(result)
        } else {
          handleError(error)
        }
        // Set up interval
        repeat.timer = setInterval(() => {
          asyncFunc().then(handleResult).catch(handleError)
        }, interval)
      })
    // Return function to clear interval
    return () => {
      // If timer is available, clear immediately, if not, wait for one interval
      if (repeat.timer) {
        clearInterval(repeat.timer)
      } else {
        setTimeout(() => {
          repeat.timer && clearInterval(repeat.timer)
        }, interval)
      }
    }
  }

}

module.exports = CocodaSDK
