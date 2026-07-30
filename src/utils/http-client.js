import jskos from "jskos-tools"

const timeout_default = 200000

export default class HttpClient {

  constructor(options = {}) {
    this.timeout = options.timeout ?? timeout_default
    this.fetch = globalThis.fetch.bind(globalThis)
  }

  getCancelTokenSource() {
    return new AbortController()
  }

  async request(url, config = {}) {
    if (!url) {
      return
    }

    const {
      method = "GET",
      headers = {},
      params = {},
      body,
      signal,
      timeout = this.timeout,
      ...options
    } = config

    const query = new URLSearchParams(params)
    if (query.size) {
      url = url + (url.indexOf("?") >= 0 ? "&" : "?") + query
    }

    const timeoutController = this.getCancelTokenSource()

    const timeoutId = setTimeout(() => {
      timeoutController.abort()
    }, timeout)

    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal

    try {
      const response = await this.fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...headers,
        },
        body:
          body == null
            ? undefined
            : typeof body === "string"
              ? body
              : JSON.stringify(body),
        signal: requestSignal,
        ...options,
      })

      if (!response.ok) {
        const error = new Error(response.statusText)
        error.status = response.status
        error.response = response
        error.config = config
        throw error
      }

      if (response.status === 204) {
        return {
          data: undefined,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          url: response.url,
          response,
        }
      }

      const contentType = response.headers.get("content-type") ?? ""

      let data = {}

      if (contentType.includes("application/json")) {
        data = await response.json()
        // TODO: add own property ._url or similar to track where data came from
      } else {
        data = await response.text()
      }

      // Apply unicode normalization
      data = jskos.normalize(data)

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url: response.url,
        response,
      }

    } finally {
      clearTimeout(timeoutId)
    }
  }
}
