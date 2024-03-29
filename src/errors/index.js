/**
 * CDKError superexport class.
 *
 * @category Errors
 */
export class CDKError extends Error {

  /**
   * CDKError constructor.
   *
   * @param {Object} options
   * @param {string} [options.message=""] message for the error
   * @param {Error} [options.relatedError=null] related error
   * @param {number} [options.code] HTTP status code for the error
   */
  constructor({ message = "", relatedError = null, code = null } = {}) {
    if (!message && relatedError && relatedError.message) {
      message = relatedError.message
    }
    super(message)
    this.name = this.constructor.name
    this.relatedError = relatedError
    this.code = code
  }
}

/**
 * MethodNotImplementedError is thrown when the called method is valid, but not implemented for the current provider.
 *
 * @category Errors
 */
export class MethodNotImplementedError extends CDKError {

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
 * InvalidOrMissingParameterError is thrown when a parameter is missing or is not valid for the request.
 *
 * @category Errors
 */
export class InvalidOrMissingParameterError extends CDKError {

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
 * InvalidRequestError is thrown when the server responded with a 4xx error (i.e. it's a problem on the client side).
 *
 * @category Errors
 */
export class InvalidRequestError extends CDKError { }

/**
 * BackendError is thrown when the server responded with a 5xx error (i.e. it's a problem on the server side).
 *
 * @category Errors
 */
export class BackendError extends CDKError { }

/**
 * BackendUnavailableError is thrown when the server did not respond, but the client's internet connection seems to be working.
 *
 * @category Errors
 */
export class BackendUnavailableError extends CDKError { }

/**
 * NetworkError is thrown when the request could not be performend (e.g. the network was not available).
 *
 * @category Errors
 */
export class NetworkError extends CDKError { }

/**
 * MissingApiUrlError is thrown when the called method is valid, but the required API URL is not available for the current registry.
 *
 * @category Errors
 */
export class MissingApiUrlError extends CDKError { }

/**
 * InvalidProviderError is thrown when a provider is added to the provider list that does not inherit from BaseProvider.
 *
 * @category Errors
 */
export class InvalidProviderError extends CDKError { }
