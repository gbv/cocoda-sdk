const jskos = require("jskos-tools")
const _ = require("../utils/lodash")
const axios = require("axios")
const utils = require("../utils")
const errors = require("../errors")

/**
 * BaseProvider to be subclassed to implement specific providers. Do not initialize a registry directly with this!
 *
 * Prefix all internal method and properties with underscore (e.g. `this._cache`)!
 *
 * Methods that can be overridden:
 * - Do not override the constructor! Use _setup instead.
 * - _setup: will be called after registry is initialized, should be used to set properties on this.has and custom preparations
 * - isAuthorizedFor: override if you want to customize
 * - supportsScheme: override if you want to customize
 * - setRegistries: implement this method if the provider needs access to other registries in cocoda-sdk (takes one parameter `registries`)
 * - getRegistries
 * - getSchemes
 * - getTypes
 * - suggest
 * - getConcordances
 * - getOccurrences
 * - getTop
 * - getConcepts
 * - getConcept
 * - getNarrower
 * - getAncestors
 * - search
 * - getMapping
 * - getMappings
 * - postMapping
 * - postMappings
 * - putMapping
 * - patchMapping
 * - deleteMapping
 * - deleteMappings
 * - getAnnotations
 * - postAnnotation
 * - putAnnotation
 * - patchAnnotation
 * - deleteAnnotation
 *
 * All of the request methods take ONE parameter which is a config object. Actual parameters should be properties on this object. The config object should be destructured to remove the properties your method needs, and the remaining config object should be given to the axios request.
 * Example:
 *  getConcept({ concept, ...config }) {
 *    return this.axios({
 *      ...config,
 *      method: "get",
 *      params: {
 *        uri: concept.uri,
 *      },
 *    })
 *  }
 *
 * Always use `this.axios` like in the example for http requests!
 *
 * @category Providers
 */
class BaseProvider {

  /**
   * Provider constructor.
   *
   * @param {Object} registry the registry for this provider
   */
  constructor(registry = {}) {
    this._jskos = registry

    this.axios = axios.create({
      // TODO: Decide on timeout value
      timeout: 5000,
    })
    // Path is used for https check and local mappings
    this.path = typeof window !== "undefined" && window.location.pathname
    // Create a dictionary with functionality of registry (defined in subclasses)
    this.has = {}
    // Set default language priority list
    this.defaultLanguages = "en,de,fr,es,nl,it,fi,pl,ru,cs,jp".split(",")
    // This can be set from the outside
    this.languages = []
    // Set auth details to null
    this.auth = {
      key: null,
      bearerToken: null,
    }
    // Set repeating requests array
    this._repeating = []

    // Set API URLs from registry object
    this.api = {
      status: registry.status,
      schemes: registry.schemes,
      top: registry.top,
      data: registry.data,
      concepts: registry.concepts,
      narrower: registry.narrower,
      ancestors: registry.ancestors,
      types: registry.types,
      suggest: registry.suggest,
      search: registry.search,
      mappings: registry.mappings,
      concordances: registry.concordances,
      annotations: registry.annotations,
      occurrences: registry.occurrences,
      reconcile: registry.reconcile,
      api: registry.api,
    }
    this.config = {}

    // Add a request interceptor
    this.axios.interceptors.request.use((config) => {
      // Add language parameter to request
      const language = _.uniq([].concat(_.get(config, "params.language", "").split(","), this.languages, this.defaultLanguages).filter(lang => lang != "")).join(",")
      _.set(config, "params.language", language)
      // Set auth
      if (this.has.auth && this.auth.bearerToken && !_.get(config, "headers.Authorization")) {
        _.set(config, "headers.Authorization", `Bearer ${this.auth.bearerToken}`)
      }

      // Don't perform http requests if site is used via https
      if (config.url.startsWith("http:") && typeof window !== "undefined" && window.location.protocol == "https:") {
        // TODO: Return proper error object.
        throw new axios.Cancel("Can't call http API from https.")
      }

      return config
    })

    // Add a response interceptor
    this.axios.interceptors.response.use(({ data, headers = {}, config = {} }) => {
      // Apply unicode normalization
      data = jskos.normalize(data)

      // Add URL to array as prop
      let url = config.url
      if (!url.endsWith("?")) {
        url += "?"
      }
      _.forOwn(config.params || {}, (value, key) => {
        url += `${key}=${encodeURIComponent(value)}&`
      })

      if (_.isArray(data) || _.isObject(data)) {
        // Add total count to array as prop
        let totalCount = parseInt(headers["x-total-count"])
        if (!isNaN(totalCount)) {
          data._totalCount = totalCount
        }
        data._url = url
      }

      // TODO: Return data or whole response here?
      return data
    })

    for (let { method, type } of utils.requestMethods) {
      // Make sure all methods exist, but thrown an error if they are not implemented
      const existingMethod = this[method] && this[method].bind(this)
      if (!existingMethod) {
        this[method] = () => { throw new errors.MethodNotImplementedError({ method }) }
        continue
      }
      this[method] = (options = {}) => {
        // Allow calling the "raw" method without adjustments
        if (options._raw) {
          delete options._raw
          return existingMethod(options)
        }
        // Add an axios cancel token to each request
        let source
        if (!options.cancelToken) {
          source = this.getCancelTokenSource()
          options.cancelToken = source.token
        }
        // Make sure a registry is initialized (see `init` method) before any request
        // TODO: Is this a good solution?
        const promise = this.init()
          .then(() => existingMethod(options))
          // Add totalCount to arrays
          .then(result => {
            if (_.isArray(result) && result._totalCount === undefined) {
              result._totalCount = result.length
            } else if (_.isObject(result) && result._totalCount === undefined) {
              result._totalCount = 1
            }
            if (type && this[`adjust${type}`]) {
              result = this[`adjust${type}`](result)
            }
            return result
          }).catch(error => {
            if (error instanceof errors.CDKError) {
              throw error
            } else {
              // TODO: Handle axios errors etc.
              throw new errors.CDKError({ relatedError: error })
            }
          })
        // Attach cancel method to Promise
        if (source) {
          promise.cancel = () => {
            return source.cancel()
          }
        }
        // Add adjustment methods
        return promise
      }
    }
  }

  // Expose some properties from original registry object as getters
  get uri() { return this._jskos.uri }
  get notation() { return this._jskos.notation }
  get prefLabel() { return this._jskos.prefLabel }
  get definition() { return this._jskos.definition }
  get schemes() { return this._jskos.schemes }
  get excludedSchemes() { return this._jskos.excludedSchemes }
  // TODO: stored, autoRefresh, suggestResultLimit, loadSchemeInfo, ...?

  /**
   * Load data about registry via the status endpoint.
   *
   * @returns {Promise} Promise that resolves when initialization is complete.
   */
  async init() {
    // Save the actual Promise in _init and return it immediately on a second call
    if (this._init) {
      return this._init
    }
    this._init = (async () => {
      let status
      if (_.isString(this.api.status)) {
        // Request status endpoint
        status = await this.axios({
          method: "get",
          url: this.api.status,
        })
      } else {
        // Assume object
        status = this.api.status
      }
      if (_.isObject(status) && !_.isEmpty(status)) {
        // Set config
        this.config = status.config || {}
        // Merge status result and existing API URLs
        for (let key of Object.keys(this.api)) {
          if (status[key] && !this.api[key]) {
            this.api[key] = status[key]
          }
        }
      }
      this._setup()
    })()
    return this._init
  }

  /**
   * Setup to be executed after init. Should be overwritten by subclasses.
   *
   * @private
   */
  _setup() {}

  /**
   * Returns a source for a axios cancel token.
   *
   * @returns {Object} axios cancel token source
   */
  getCancelTokenSource() {
    return axios.CancelToken.source()
  }

  /**
   * Sets authentication credentials.
   *
   * @param {Object} options
   * @param {string} options.key public key of login-server instance the user is authorized for
   * @param {string} options.bearerToken token that is sent with each request
   */
  setAuth({ key = this.auth.key, bearerToken = this.auth.bearerToken }) {
    this.auth.key = key
    this.auth.bearerToken = bearerToken
  }

  /**
   * Returns whether a user is authorized for a certain request.
   *
   * @param {Object} options
   * @param {string} options.type type of item (e.g. mappings)
   * @param {string} options.action action to be performed (read/create/update/delete)
   * @param {Object} options.user user object
   * @param {boolean} [options.crossUser] whether the request is a crossUser request (i.e. updading/deleting another user's item)
   * @returns {boolean}
   */
  isAuthorizedFor({ type, action, user, crossUser }) {
    if (action == "read" && this.has[type] === true) {
      return true
    }
    if (!this.has[type]) {
      return false
    }
    const options = _.get(this.config, `${type}.${action}`)
    if (!options) {
      return !!this.has[type][action]
    }
    if (options.auth && (!user || !this.auth.key)) {
      return false
    }
    // Public key mismatch
    if (options.auth && this.auth.key != _.get(this.config, "auth.key")) {
      return false
    }
    if (options.auth && options.identities) {
      // Check if one of the user's identities matches
      const uris = [user.uri].concat(Object.values(user.identities || {}).map(id => id.uri)).filter(uri => uri != null)
      if (_.intersection(uris, options.identities).length == 0) {
        return false
      }
    }
    if (options.auth && options.identityProviders) {
      // Check if user has the required provider
      const providers = Object.keys((user && user.identities) || {})
      if (_.intersection(providers, options.identityProviders).length == 0) {
        return false
      }
    }
    if (crossUser) {
      return !!options.crossUser
    }
    return !!this.has[type][action]
  }

  /**
   * Returns a boolean whether a certain target scheme is supported or not.
   *
   * @param {Object} scheme
   * @returns {boolean}
   */
  supportsScheme(scheme) {
    if (!scheme) {
      return false
    }
    let schemes = _.isArray(this.schemes) ? this.schemes : null
    if (schemes == null && !jskos.isContainedIn(scheme, this.excludedSchemes || [])) {
      return true
    }
    return jskos.isContainedIn(scheme, schemes)
  }

  adjustConcept(concept) {
    // Add _getNarrower function to concepts
    concept._getNarrower = (config) => {
      return this.getNarrower({ ...config, concept })
    }
    // Add _getAncestors function to concepts
    concept._getAncestors = (config) => {
      return this.getAncestors({ ...config, concept })
    }
    // Add _getDetails function to concepts
    concept._getDetails = (config) => {
      return this.getConcept({ ...config, concept })
    }
    // Add _provider to concepts
    concept._provider = this
    return concept
  }
  adjustConcepts(concepts) {
    let newConcepts = concepts.map(concept => this.adjustConcept(concept))
    // Retain custom props if available
    newConcepts._totalCount = concepts._totalCount
    newConcepts._url = concepts._url
    return newConcepts
  }
  adjustRegistries(registries) {
    return registries
  }
  adjustSchemes(schemes) {
    for (let scheme of schemes) {
      // Add _getTop function to schemes
      scheme._getTop = (config) => {
        return this.getTop({ ...config, scheme })
      }
      // Add _getTypes function to schemes
      scheme._getTypes = (config) => {
        return this.getTypes({ ...config, scheme })
      }
      // Add _provider to schemes
      scheme._provider = this
      // Add _suggest function to schemes
      scheme._suggest = ({ search, ...config }) => {
        return this.suggest({ ...config, search, scheme })
      }
    }
    return schemes
  }
  adjustConcordances(concordances) {
    for (let concordance of concordances) {
      // Add _provider to concordance
      concordance._provider = this
    }
    return concordances
  }
  adjustMapping(mapping) {
    // TODO: Add default type
    // Add fromScheme and toScheme if missing
    for (let side of ["from", "to"]) {
      let sideScheme = `${side}Scheme`
      if (!mapping[sideScheme]) {
        mapping[sideScheme] = _.get(jskos.conceptsOfMapping(mapping, side), "[0].inScheme[0]", null)
      }
    }
    mapping._provider = this
    if (!mapping.identifier) {
      // Add mapping identifiers for this mapping
      let identifier = _.get(jskos.addMappingIdentifiers(mapping), "identifier")
      if (identifier) {
        mapping.identifier = identifier
      }
    }
    return mapping
  }
  adjustMappings(mappings) {
    let newMappings = mappings.map(mapping => this.adjustMapping(mapping))
    // Retain custom props if available
    newMappings._totalCount = mappings._totalCount
    newMappings._url = mappings._url
    return newMappings
  }

  /**
   * GETs information about a single concept. Do not override in subclass!
   *
   * TODO: Evaluate whether concept and/or uri should be used.
   * ? Returning a single object removes API URL. How should we do this?
   *
   * @param {Object} config
   * @param {Object} config.concept concept to be requested
   * @param {string} config.uri concept URI (alternative to concept)
   * @returns {Object} JSKOS concept object
   */
  async getConcept({ concept, uri, ...config } = {}) {
    if (!concept && !uri) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "concept" })
    }
    return this.getConcepts({
      concepts: [concept || { uri }],
      ...config,
      _raw: true,
    }).then(result => result[0])
  }

  /**
   * POSTs multiple mappings. Do not override in subclass!
   *
   * @param {Object} config
   * @param {Array} config.mappings array of mapping objects
   * @returns {Object[]} array of created mapping objects
   */
  async postMappings({ mappings, ...config } = {}) {
    if (!mappings || !mappings.length) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mappings" })
    }
    return Promise.all(mappings.map(mapping => this.postMapping({ mapping, ...config, _raw: true })))
  }

  /**
   * DELETEs multiple mappings. Do not override in subclass!
   *
   * @param {Object} config
   * @param {Array} config.mappings array of mapping objects
   */
  async deleteMappings({ mappings, ...config } = {}) {
    if (!mappings || !mappings.length) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mappings" })
    }
    return Promise.all(mappings.map(mapping => this.deleteMapping({ mapping, ...config, _raw: true })))
  }

  /**
   * Repeatedly call a certain method.
   *
   * Callback will only be called if the results were changed.
   *
   * Example:
   * ```js
   *  provider.repeat({
   *    method: "getMappings",
   *    callback: (result) => console.log(result),
   *    limit: 3,
   *    offset: 3,
   *  })
   * ```
   *
   * @param {Object} config See properties below. Additionally include parameters needed for the actual request.
   * @param {string} config.method name of method to be called
   * @param {number} [config.interval=15000] interval in ms
   * @param {Function} config.callback callback function called with two parameters (result, error)
   * @returns {Function} function to cancel the repeating request
   */
  repeat({ method, interval = 15000, callback, ...config } = {}) {
    // Check parameters
    // ? Are these thorough checks really necessary?
    if (!method) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "method" })
    }
    if (!this[method]) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "method", message: "method does not exist" })
    }
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
    this._repeating.push(repeat)
    // Functions to handle results and errors
    const handleResult = (result) => {
      if (!_.isEqual(repeat.result, result)) {
        callback(result)
        repeat.result = result
      }
    }
    const handleError = (error) => {
      callback(null, error)
    }
    // Call method once immediately
    this[method](config)
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
          this[method](config).then(handleResult).catch(handleError)
        }, interval)
      })
    // Return function to clear interval
    return () => {
      this._repeating = this._repeating.filter(r => r != repeat)
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

BaseProvider.providerName = "Base"

module.exports = BaseProvider
