
class CDKError extends Error {
  constructor({ message = "", relatedError = null, code = null } = {}) {
    super(message)
    this.name = this.constructor.name
    this.relatedError = relatedError
    this.code = code
  }
}

CDKError.MethodNotImplemented = class MethodNotImplementedError extends CDKError {
  constructor({ method, message = "", ...options }) {
    options.message = `Method not implemented: ${method} (${message})`
    super(options)
  }
}

CDKError.InvalidOrMissingParameter = class InvalidOrMissingParameterError extends CDKError {
  constructor({ parameter, message = "", ...options }) {
    options.message = `Invalid or missing parameter: ${parameter} (${message})`
    super(options)
  }
}

CDKError.MissingRegistry = class MissingRegistryError extends CDKError {}

CDKError.InvalidRequest = class InvalidRequestError extends CDKError {}

CDKError.MissingApiUrl = class MissingApiUrlError extends CDKError {}

module.exports = CDKError
