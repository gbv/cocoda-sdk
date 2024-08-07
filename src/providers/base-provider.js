import jskos from "jskos-tools"
import * as _ from "../utils/lodash.js"
import axios from "axios"
import * as utils from "../utils/index.js"
import * as errors from "../errors/index.js"

/**
 * BaseProvider to be subclassed to implement specific providers. Do not initialize a registry directly with this!
 *
 * Prefix all internal method and properties with underscore (e.g. `this._cache`)!
 * 
 * Static members that should be set:
 * - providerName (This is how a provider is identified in a "registry" object in field `provider`.)
 * - providerType (Optional BARTOC API type URI. Supported types: https://github.com/gbv/bartoc.org/blob/main/data/bartoc-api-types.concepts.csv, the URI prefix is "http://bartoc.org/api-type/".)
 * - supports (Optional object of supported capabilities. The keys should be values from this list: https://github.com/gbv/cocoda-sdk/blob/9145952398d6828004beb395c1d392a4d24e9288/src/utils/index.js#L159-L174; values should be a boolean. `false` values can be left out. They will be used to initialize `this.has` (see below). Alternatively, `this.has` can be filled in `_prepare` or `_setup`.)
 *
 * Methods that can be overridden:
 * - Do not override the constructor! Use _prepare or _setup instead.
 * - _prepare: will be called before the registry is initialized (i.e. it's `/status` endpoint is queries if necessasry)
 * - _setup: will be called after registry is initialized (i.e. it's `/status` endpoint is queries if necessasry), should be used to set properties on this.has and custom preparations
 * - isAuthorizedFor: override if you want to customize
 * - supportsScheme: override if you want to customize
 * - getRegistries
 * - getSchemes
 * - getTypes
 * - suggest
 * - getConcordances
 * - getOccurrences
 * - getTop
 * - getConcepts
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
 * Internal (starting with underscore) and external properties that can be used:
 * - `this.cdk`: a reference to the current CDK instance (can be use to request other registries or initialize a new registry)
 * - `this.has`: an object of functionality of the registry (needs to be set by subclasses)
 * - `this.languages`: an array of language tags provided by the user in order of priority
 * - `this._jskos`: the raw JSKOS object used to initialize this registry
 * - `this._path`: if available, the path of the current browser window
 * - `this._defaultLanguages`: an array of default language tags
 * - `this._auth`: authentication key and token
 * - `this._api`: object of API endpoints for the registry
 * - `this._config`: configuration of the registry as provided by the `/status` endpoint if available
 *
 * All of the request methods take ONE parameter which is a config object. Actual parameters should be properties on this object. The config object should be destructured to remove the properties your method needs, and the remaining config object should be given to the axios request.
 * Example:
 * ```js
 *  getConcept({ concept, ...config }) {
 *    return this.axios({
 *      ...config,
 *      method: "get",
 *      params: {
 *        uri: concept.uri,
 *      },
 *    })
 *  }
 * ```
 *
 * Always use `this.axios` like in the example for http requests!
 *
 * @category Providers
 */
export default class BaseProvider {

  /**
   * Provider constructor.
   *
   * @param {Object} registry the registry for this provider
   */
  constructor(registry = {}) {
    this._jskos = registry

    this.axios = axios.create({
      // TODO: Decide on timeout value
      timeout: 20000,
    })
    // Path is used for https check and local mappings
    this._path = typeof window !== "undefined" && window.location.pathname
    /**
     * A dictionary with functionality of the registry (e.g. `registry.has.schemes`).
     * @type {Object}
     * @readonly
     */
    this.has = {}
    // Use values from static "supports" value
    if (this.constructor?.supports) {
      this.has = Object.assign({}, this.constructor?.supports)
    }
    // Explicitly set other capabilities to false
    utils.listOfCapabilities.filter(c => !this.has[c]).forEach(c => {
      this.has[c] = false
    })
    // Set default language priority list
    this._defaultLanguages = "en,de,fr,es,nl,it,fi,pl,ru,cs,jp".split(",")
    /**
     * A list of RFC 3066 language tags in lowercase in order of priority.
     * @type {string[]}
     */
    this.languages = []
    // Set auth details to null
    this._auth = {
      key: null,
      bearerToken: null,
    }
    // Set repeating requests array
    this._repeating = []

    // Set API URLs from registry object
    this._api = {
      status: registry.status,
      // If `schemes` on registry is an array, remove it because we're only keeping it in this._jskos.schemes
      schemes: Array.isArray(registry.schemes) ? undefined : registry.schemes,
      top: registry.top,
      data: registry.data,
      concepts: registry.concepts,
      narrower: registry.narrower,
      ancestors: registry.ancestors,
      types: registry.types,
      suggest: registry.suggest,
      search: registry.search,
      "voc-suggest": registry["voc-suggest"],
      "voc-search": registry["voc-search"],
      mappings: registry.mappings,
      concordances: registry.concordances,
      annotations: registry.annotations,
      occurrences: registry.occurrences,
      reconcile: registry.reconcile,
      api: registry.api,
    }
    this._config = {}

    // Set default retry config
    this.setRetryConfig()

    // Add a request interceptor
    this.axios.interceptors.request.use((config = {}) => {
      if (!config._skipAdditionalParameters) {
        // Add language parameter to request
        const language = _.uniq([].concat(_.get(config, "params.language", "").split(","), this.languages, this._defaultLanguages).filter(lang => lang != "")).join(",")
        _.set(config, "params.language", language)
        // Set auth
        if (this.has.auth && this._auth.bearerToken && !_.get(config, "headers.Authorization")) {
          _.set(config, "headers.Authorization", `Bearer ${this._auth.bearerToken}`)
        }
      }

      // Don't perform http requests if site is used via https
      if (config.url?.startsWith("http:") && typeof window !== "undefined" && window.location.protocol == "https:") {
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
    }, error => {
      const count = _.get(error, "config._retryCount", 0)
      const method = _.get(error, "config.method")
      const statusCode = _.get(error, "response.status")
      if (
        this._retryConfig.methods.includes(method)
        && this._retryConfig.statusCodes.includes(statusCode)
        && count < this._retryConfig.count
      ) {
        error.config._retryCount = count + 1
        // from: https://github.com/axios/axios/issues/934#issuecomment-531463172
        if (error.config.data) {
          error.config.data = JSON.parse(error.config.data)
        }
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.axios(error.config).then(resolve).catch(reject)
          }, (() => {
            const delay = this._retryConfig.delay
            if (typeof delay === "function") {
              return delay(count)
            }
            return delay
          })())
        })
      } else {
        return Promise.reject(error)
      }
    })

    const currentRequests = []
    for (let { method, type } of utils.requestMethods) {
      // Make sure all methods exist, but thrown an error if they are not implemented
      const existingMethod = this[method] && this[method].bind(this)
      if (!existingMethod) {
        this[method] = () => {
          throw new errors.MethodNotImplementedError({ method }) 
        }
        continue
      }
      this[method] = (options = {}) => {
        // Allow calling the "raw" method without adjustments
        if (options._raw) {
          delete options._raw
          return existingMethod(options)
        }
        // Return from existing requests if one exists
        const existingRequest = currentRequests.find(r => r.method == method && _.isEqual(r.options, options))
        if (existingRequest) {
          return existingRequest.promise
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
            if (result && type && this[`adjust${type}`]) {
              result = this[`adjust${type}`](result)
            }
            return result
          }).catch(error => {
            if (error instanceof errors.CDKError) {
              throw error
            } else {
              if (error.response) {
                // 4xx = invalid request
                if (error.response.status.toString().startsWith(4)) {
                  throw new errors.InvalidRequestError({ relatedError: error, code: error.response.status })
                } else {
                  throw new errors.BackendError({ relatedError: error, code: error.response.status })
                }
              } else if (error.request) {
                if (typeof navigator !== "undefined") {
                  // If connected, it should be a backend problem
                  if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
                    throw new errors.BackendUnavailableError({ relatedError: error })
                  }
                }
                // Otherwise, assume a network error
                throw new errors.NetworkError({ relatedError: error })
              } else {
                // Otherwise, throw generic CDKError
                throw new errors.CDKError({ relatedError: error })
              }
            }
          })
        // Attach cancel method to Promise
        if (source) {
          promise.cancel = (...args) => {
            return source.cancel(...args)
          }
        }
        // Save to list of existing requests
        const request = {
          method,
          options: _.omit(options, ["cancelToken"]),
          promise,
        }
        currentRequests.push(request)
        // Remove from list of current requests after promise is done
        promise.catch(() => { }).then(() => currentRequests.splice(currentRequests.indexOf(request), 1))
        // Add adjustment methods
        return promise
      }
    }
  }

  // Expose some properties from original registry object as getters
  get uri() {
    return this._jskos.uri 
  }
  get notation() {
    return this._jskos.notation 
  }
  get prefLabel() {
    return this._jskos.prefLabel 
  }
  get definition() {
    return this._jskos.definition 
  }
  get schemes() {
    return this._jskos.schemes 
  }
  get excludedSchemes() {
    return this._jskos.excludedSchemes 
  }
  get stored() {
    return this._jskos.stored !== undefined ? this._jskos.stored : this.constructor.stored 
  }

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
      // Call preparation method
      this._prepare()
      let status
      if (_.isString(this._api.status)) {
        // Request status endpoint
        try {
          status = await this.axios({
            method: "get",
            url: this._api.status,
          })
        } catch (error) {
          if (_.get(error, "response.status") === 404) {
            // If /status is not available, remove from _api
            this._api.status = null
          }
        }
      } else {
        // Assume object
        status = this._api.status
      }
      if (_.isObject(status) && !_.isEmpty(status)) {
        // Set config
        this._config = status.config || {}
        // Merge status result and existing API URLs
        for (let key of Object.keys(this._api)) {
          // Only override if undefined
          if (this._api[key] === undefined) {
            // Fall back to null, i.e. if /status was successful, no endpoints are implied by the provider
            // See also: https://github.com/gbv/cocoda-sdk/issues/21
            this._api[key] = status[key] || null
          }
        }
      }
      this._setup()
    })()
    return this._init
  }

  /**
   * Preparation to be executed before init. Should be overwritten by subclasses.
   *
   * @private
   */
  _prepare() { }

  /**
   * Setup to be executed after init. Should be overwritten by subclasses.
   *
   * @private
   */
  _setup() { }

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
  setAuth({ key = this._auth.key, bearerToken = this._auth.bearerToken }) {
    this._auth.key = key
    this._auth.bearerToken = bearerToken
  }

  /**
   * Sets retry configuration.
   *
   * @param {Object} config
   * @param {string[]} [config.methods=["get", "head", "options"]] HTTP methods to retry (lowercase)
   * @param {number[]} [config.statusCodes=[401, 403]] status codes to retry
   * @param {number} [config.count=3] maximum number of retries
   * @param {number|Function} [config.delay=300*count] a delay in ms or a function that takes the number of current retries and returns a delay in ms
   */
  setRetryConfig(config = {}) {
    this._retryConfig = Object.assign({
      methods: ["get", "head", "options"],
      statusCodes: [401, 403],
      count: 3,
      delay: (count) => {
        return 300 * count
      },
    }, config)
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
    const options = _.get(this._config, `${type}.${action}`)
    if (!options) {
      return !!this.has[type][action]
    }
    if (options.auth && (!user || !this._auth.key)) {
      return false
    }
    // Public key mismatch
    if (options.auth && this._auth.key != _.get(this._config, "auth.key")) {
      return false
    }
    // Check if one of the user's identities matches
    const userUris = [user?.uri].concat(Object.values(user?.identities || {}).map(id => id.uri)).filter(Boolean)
    if (options.auth && options.identities) {
      if (_.intersection(userUris, options.identities).length == 0) {
        return false
      }
    }
    if (options.auth && options.identityProviders) {
      // Check if user has the required provider
      const providers = Object.keys((user?.identities) || {})
      if (_.intersection(providers, options.identityProviders).length == 0) {
        return false
      }
    }
    // Check crossUser capabilities
    if (crossUser) {
      return options.crossUser === true || _.intersection(options.crossUser || [], userUris).length > 0
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
    // Don't adjust when already saved in Cocoda
    if (!concept || concept.__SAVED__) {
      return concept
    }
    // Add _getNarrower function to concepts
    concept._getNarrower = (config) => {
      return this.getNarrower({ ...config, concept })
    }
    // Add _getAncestors function to concepts
    concept._getAncestors = (config) => {
      return this.getAncestors({ ...config, concept })
    }
    // Add _getDetails function to concepts
    concept._getDetails = async (config) => {
      return (await this.getConcepts({ ...config, concepts: [concept] }))[0]
    }
    // Adjust broader/narrower/ancestors if necessary
    for (let type of ["broader", "narrower", "ancestors"]) {
      if (Array.isArray(concept[type]) && concept[type].length && !concept[type].includes(null)) {
        concept[type] = this.adjustConcepts(concept[type])
      }
    }
    // Add _registry to concepts
    concept._registry = this
    return concept
  }
  adjustConcepts(concepts) {
    return utils.withCustomProps(concepts.map(concept => this.adjustConcept(concept)), concepts)
  }
  adjustRegistries(registries) {
    return registries
  }
  adjustScheme(scheme) {
    // Don't adjust when already saved in Cocoda
    if (!scheme || scheme.__SAVED__) {
      return scheme
    }
    // Add _registry to schemes
    const previousRegistry = scheme._registry
    scheme._registry = this.cdk && this.cdk.registryForScheme(scheme)
    if (!scheme._registry || previousRegistry === scheme._registry || scheme._registry._api.api === this._api.api) {
      scheme._registry = previousRegistry || this
    } else {
      // Remove scheme's `concepts` and `topConcepts` fields if they are [] or [null]
      // because the registry has changed and they might not be accurate.
      ["concepts", "topConcepts"].forEach(key => {
        if (Array.isArray(scheme[key]) && (scheme[key].length === 0 || scheme[key][0] === null)) {
          delete scheme[key]
        }
      })
    }
    if (scheme._registry) {
      // Add _getTop function to schemes
      scheme._getTop = (config) => {
        return scheme._registry.getTop({ ...config, scheme })
      }
      // Add _getTypes function to schemes
      scheme._getTypes = (config) => {
        return scheme._registry.getTypes({ ...config, scheme })
      }
      // Add _suggest function to schemes
      scheme._suggest = ({ search, ...config }) => {
        return scheme._registry.suggest({ ...config, search, scheme })
      }
    }
    return scheme
  }
  adjustSchemes(schemes) {
    return utils.withCustomProps(schemes.map(scheme => this.adjustScheme(scheme)), schemes)
  }
  adjustConcordances(concordances) {
    for (let concordance of concordances) {
      // Add _registry to concordance
      concordance._registry = this
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
    mapping._registry = this
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
    return utils.withCustomProps(mappings.map(mapping => this.adjustMapping(mapping)), mappings)
  }

  /**
   * POSTs multiple mappings. Do not override in subclass!
   *
   * @param {Object} config
   * @param {Array} config.mappings array of mapping objects
   * @returns {Object[]} array of created mapping objects; in case of failure, consult the `_errors` property on the array at the index of the failed request
   */
  async postMappings({ mappings, ...config } = {}) {
    if (!mappings || !mappings.length) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mappings" })
    }
    return this._callHelperForArrayWrappers({
      method: "postMapping",
      items: mappings,
      itemProperty: "mapping",
      config,
    })
  }

  /**
   * DELETEs multiple mappings. Do not override in subclass!
   *
   * @param {Object} config
   * @param {Array} config.mappings array of mapping objects
   * @returns {Object[]} array of results (`true` if successful); in case of failure, consult the `_errors` property on the array at the index of the failed request
   */
  async deleteMappings({ mappings, ...config } = {}) {
    if (!mappings || !mappings.length) {
      throw new errors.InvalidOrMissingParameterError({ parameter: "mappings" })
    }
    return this._callHelperForArrayWrappers({
      method: "deleteMapping",
      items: mappings,
      itemProperty: "mapping",
      config,
    })
  }

  /**
   * Calls a method that is for only one item for an array of items. Returns an array of results.
   *
   * If there is an error, that index in the result array will be `null`. There is a property `_errors` on the result array that will contain the respective error at the correct index.
   *
   * @param {Object} options
   * @param {string} options.method instance method to call (e.g. `postMapping`)
   * @param {Object[]} options.items items to call the method for
   * @param {string} options.itemProperty the property name for the item when calling the method (e.g. `mapping`)
   * @param {Object} options.config other properties to pass to the method call
   * @returns {any[]} result array with values returned from individual method calls
   *
   * @private
   */
  async _callHelperForArrayWrappers({ method, items, itemProperty, config }) {
    const errors = []
    const resultItems = await Promise.all(items.map(async item => {
      try {
        const resultItem = await this[method]({ [itemProperty]: item, ...config, _raw: true })
        return resultItem
      } catch (error) {
        errors[items.indexOf(item)] = error
        return null
      }
    }))
    resultItems._errors = errors
    return resultItems
  }

}

BaseProvider.providerName = "Base"
