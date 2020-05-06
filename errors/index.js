
class CDKError extends Error {
  constructor({ message = "", relatedError = null, code = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.relatedError = relatedError
    this.code = code
  }
}

/**
 * MethodNotImplementedError should be thrown when the called method is valid, but not implemented for the current provider.
 */
class MethodNotImplementedError extends CDKError {
  constructor({ method, message = "", ...options }) {
    options.message = `Method not implemented: ${method} (${message})`
    super(options)
  }
}

/**
 * InvalidOrMissingParameterError should be thrown when a parameter is missing or is not valid for the request.
 */
class InvalidOrMissingParameterError extends CDKError {
  constructor({ parameter, message = "", ...options }) {
    options.message = `Invalid or missing parameter: ${parameter} (${message})`
    super(options)
  }
}

/**
 * MissingRegistryError should be thrown by cocoda-sdk to indicate that a registry is needed to perform the request.
 */
class MissingRegistryError extends CDKError {}

/**
 * InvalidRequestError should be thrown when the request is somehow invalid.
 *
 * ? Where is this needed?
 */
class InvalidRequestError extends CDKError {}

/**
 * MissingApiUrlError should be thrown when the called method is valid, but the required API URL is not available for the current registry.
 */
class MissingApiUrlError extends CDKError {}

module.exports = {
  CDKError,
  MethodNotImplementedError,
  InvalidOrMissingParameterError,
  MissingRegistryError,
  InvalidRequestError,
  MissingApiUrlError,
}