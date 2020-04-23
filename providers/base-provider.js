const jskos = require("jskos-tools")
const _ = require("lodash")
const axios = require("axios")
const utils = require("../utils")

/**
 * TODO: Documentation.
 * TODO: Adjustment methods.
 */
class BaseProvider {

  constructor({ registry } = {}) {
    this.registry = registry

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

    // Add a request interceptor
    this.axios.interceptors.request.use((config) => {
      // Add language parameter to request
      if (!_.get(config, "params.language")) {
        const language = _.uniq([].concat(_.get(config, "params.language", "").split(","), this.languages, this.defaultLanguages).filter(lang => lang != "")).join(",")
        _.set(config, "params.language", language)
      }
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
    this.axios.interceptors.response.use(({ data, headers, config }) => {
      // Apply unicode normalization
      data = jskos.normalize(data)

      if (_.isArray(data)) {
        // Add total count to array as prop
        let totalCount = parseInt(headers["x-total-count"])
        if (totalCount) {
          data.totalCount = totalCount
        } else {
          // TODO: Does this break things or does this help?
          data.totalCount = data.length
        }
        // Add URL to array as prop
        let url = config.url
        if (!url.endsWith("?")) {
          url += "?"
        }
        _.forOwn(config.params || {}, (value, key) => {
          url += `${key}=${encodeURIComponent(value)}&`
        })
        data.url = url
      }

      // TODO: Return data or whole response here?
      return data
    })

    for (let method of utils.requestMethods) {
      // Make sure underscore methods exist, but return a rejecting Promise
      const existingMethod = this[method] && this[method].bind(this)
      if (!existingMethod) {
        // TODO: Use proper error object
        this[method] = () => Promise.reject("Method not implemented")
        continue
      }
      this[method] = (options = {}) => {
        // Allow calling the "raw" method without adjustments
        if (options._raw) {
          delete options._raw
          return existingMethod(options)
        }
        let source
        if (!options.cancelToken) {
          source = this.getCancelTokenSource()
          options.cancelToken = source.token
        }
        // Call same method with leading underscore
        // TODO: Is this a good solution?
        const promise = this.init()
          .then(() => existingMethod(options))
          // Add totalCount to arrays
          .then(result => {
            if (_.isArray(result) && result.totalCount === undefined) {
              result.totalCount = result.length
            }
            return result
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

  /**
   * Load data about registry via the status endpoint.
   */
  async init() {
    // Save the actual Promise in _init and return it immediately on a second call
    if (this._init) {
      return this._init
    }
    this._init = (async () => {
      let status
      if (_.isString(this.registry.status)) {
        // Request status endpoint
        status = await this.axios({
          method: "get",
          url: this.registry.status,
        })
      } else {
        // Assume object
        status = this.registry.status
      }
      if (_.isObject(status) && !_.isEmpty(status)) {
        // Merge status result and registry
        // (registry always has priority)
        this.registry = _.merge({}, status, this.registry)
      }
      this._setup()
    })()
    return this._init
  }

  /**
   * Setup to be executed after init. Should be overwritten by subclasses.
   */
  _setup() {}

  /**
   * Returns a source for a axios cancel token.
   */
  getCancelTokenSource() {
    return axios.CancelToken.source()
  }

  setAuth({ key, bearerToken }) {
    this.auth.key = key
    this.auth.bearerToken = bearerToken
  }

  isAuthorizedFor({ type, action, user, crossUser }) {
    if (action == "read" && this.has[type] === true) {
      return true
    }
    if (!this.has[type]) {
      return false
    }
    const options = _.get(this.registry, `config.${type}.${action}`)
    if (!options) {
      return !!this.has[type][action]
    }
    if (options.auth && (!user || !this.auth.key)) {
      return false
    }
    // Public key mismatch
    if (options.auth && this.auth.key != this.registry.config.auth.key) {
      return false
    }
    if (options.auth && options.identities) {
      // Check if on of the user's identities matches
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
   * @param {object} scheme
   */
  supportsScheme(scheme) {
    if (!scheme) {
      return false
    }
    let schemes = _.isArray(this.registry.schemes) ? this.registry.schemes : null
    if (schemes == null && !jskos.isContainedIn(scheme, this.registry.excludedSchemes || [])) {
      return true
    }
    return jskos.isContainedIn(scheme, schemes)
  }

  // TODO: Reevaluate adjustment methods
  adjustConcepts(concepts) {
    for (let concept of concepts) {
      // Add _getNarrower function to concepts
      concept._getNarrower = () => {
        return this.getNarrower(concept)
      }
      // Add _getAncestors function to concepts
      concept._getAncestors = () => {
        return this.getAncestors(concept)
      }
      // Add _getDetails function to concepts
      concept._getDetails = () => {
        return this.getDetails(concept)
      }
    }
    return concepts
  }
  adjustRegistries(registries) {
    return registries
  }
  adjustSchemes(schemes) {
    for (let scheme of schemes) {
      // Add _getTop function to schemes
      scheme._getTop = () => {
        return this.getTop(scheme)
      }
      // Add _getTypes function to schemes
      scheme._getTypes = () => {
        return this.getTypes(scheme)
      }
      // Add _provider to schemes
      scheme._provider = this
      // Add _suggest function to schemes
      scheme._suggest = (search) => {
        return this.suggest(search, scheme)
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
        mapping[sideScheme] = _.get(jskos.conceptsOfMapping(mapping, side), "[0].inScheme[0]")
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
    if (mappings.totalCount) {
      newMappings.totalCount = mappings.totalCount
    }
    if (mappings.url) {
      newMappings.url = mappings.url
    }
    return newMappings
  }

  /**
   * GETs information about a single concept. Do not override in subclass!
   *
   * TODO: Evaluate whether concept and/or uri should be used.
   * ? Returning a single object removes API URL. How should we do this?
   *
   * @param {object} config
   */
  async getConcept({ concept, uri, ...config } = {}) {
    if (!concept && !uri) {
      throw new Error("Expecting concept or uri to load")
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
   * @param {object} config
   */
  async postMappings({ mappings = [], ...config } = {}) {
    return Promise.all(mappings.map(mapping => this.postMapping({ mapping, ...config, _raw: true })))
  }

  /**
   * DELETEs multiple mappings. Do not override in subclass!
   *
   * @param {object} config
   */
  async deleteMappings({ mappings = [], ...config } = {}) {
    return Promise.all(mappings.map(mapping => this.deleteMapping({ mapping, ...config, _raw: true })))
  }

}

BaseProvider.providerName = "Base"

module.exports = BaseProvider
