/**
 * CDKError superclass.
 *
 * @category Errors
 */
class CDKError extends Error {

  /**
   * CDKError constructor.
   *
   * @param {Object} options
   * @param {string} [options.message=""] message for the error
   * @param {Error} [options.relatedError=null] related error
   * @param {number} [options.code] HTTP status code for the error
   */
  constructor({ message = "", relatedError = null, code = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.relatedError = relatedError
    this.code = code
  }
}

/**
 * MethodNotImplementedError should be thrown when the called method is valid, but not implemented for the current provider.
 *
 * @category Errors
 */
class MethodNotImplementedError extends CDKError {

  /**
   * MethodNotImplementedError constructor.
   *
   * @param {Object} config
   * @param {string} config.method method that this error refers to
   * @param {string} [config.message=""] message for the error
   */
  constructor({ method, message = "", ...options }) {
    options.message = `Method not implemented: ${method} (${message})`
    super(options)
  }
}

/**
 * InvalidOrMissingParameterError should be thrown when a parameter is missing or is not valid for the request.
 *
 * @category Errors
 */
class InvalidOrMissingParameterError extends CDKError {

  /**
   * InvalidOrMissingParameterError constructor.
   *
   * @param {Object} config
   * @param {string} config.parameter parameter that this error refers to
   * @param {string} [config.message=""] message for the error
   */
  constructor({ parameter, message = "", ...options }) {
    options.message = `Invalid or missing parameter: ${parameter} (${message})`
    super(options)
  }
}

/**
 * MissingRegistryError should be thrown by cocoda-sdk to indicate that a registry is needed to perform the request.
 *
 * @category Errors
 */
class MissingRegistryError extends CDKError {}

/**
 * InvalidRequestError should be thrown when the request is somehow invalid.
 *
 * ? Where is this needed?
 *
 * @category Errors
 */
class InvalidRequestError extends CDKError {}

/**
 * MissingApiUrlError should be thrown when the called method is valid, but the required API URL is not available for the current registry.
 *
 * @category Errors
 */
class MissingApiUrlError extends CDKError {}

/**
 * InvalidProviderError should be thrown when a provider is added to the provider list that does not inherit from BaseProvider.
 *
 * @category Errors
 */
class InvalidProviderError extends CDKError {}

module.exports = {
  CDKError,
  MethodNotImplementedError,
  InvalidOrMissingParameterError,
  MissingRegistryError,
  InvalidRequestError,
  MissingApiUrlError,
  InvalidProviderError,
}
