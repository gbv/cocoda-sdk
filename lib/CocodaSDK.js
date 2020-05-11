const providers = require("../providers")
const errors = require("../errors")
const axios = require("axios")
const _ = require("../utils/lodash")

class CocodaSDK extends Function {

  /**
   * CDK constructor.
   *
   * @param {Object} [config={}] Cocoda config object
   */
  constructor(config) {
    // See https://stackoverflow.com/a/40878674/11050851 how this all works.
    super("...args", "return this.__self__.__call__(...args)")
    const self = this.bind(this)
    this.__self__ = self
    self.config = config
    return self
  }

  // Will be called when instance of this class is called as a function.
  __call__(config) {
    this.config = config
    return this
  }

  /**
   * Configuration
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
    this.config.registries.find(r => r.uri == uri)
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

}

module.exports = CocodaSDK
