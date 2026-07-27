/**
 * Mock adapter for HttpClient
 * Simulates HTTP requests for testing purposes
 */
export class HttpMockAdapter {
  constructor(httpClient) {
    this.httpClient = httpClient
    this.handlers = {
      get: [],
      post: [],
      delete: [],
    }

    this.httpClient.setAdapter(async (url, options = {}) => {
      const method = (options.method || "GET").toLowerCase()
      const response = this.getMockResponse(method, url, options)
      const responseBody = response.status === 204 
        ? undefined
        : typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data)
      const responseHeaders = new Headers({
        "Content-Type": "application/json",
        ...response.headers,
      })
      return new Response(responseBody, {
        status: response.status,
        headers: responseHeaders,
      })
    })
  }

  /**
   * Register a GET request handler
   * @param {string} url - URL pattern to match
   * @returns {Object} Handler object with reply method
   */
  onGet(url) {
    return this._createHandler("get", url)
  }

  /**
   * Register a POST request handler
   * @param {string} url - URL pattern to match
   * @returns {Object} Handler object with reply method
   */
  onPost(url) {
    return this._createHandler("post", url)
  }

  /**
   * Register a DELETE request handler
   * @param {string} url - URL pattern to match
   * @returns {Object} Handler object with reply method
   */
  onDelete(url) {
    return this._createHandler("delete", url)
  }

  /**
   * Create a handler for a specific method and URL
   * @private
   * @param {string} method - HTTP method (get, post, delete)
   * @param {string} url - URL pattern to match
   * @returns {Object} Handler object with reply method
   */
  _createHandler(method, url) {
    const handler = {
      url,
      reply: (status, data, headers) => {
        // support reply(fn) for dynamic responses or reply(status, data, headers)
        if (typeof status === "function") {
          this.handlers[method].push({
            url,
            generator: status,
          })
          return this
        }

        this.handlers[method].push({
          url,
          status: status || 200,
          data: data || null,
          headers: headers || {},
        })
        return this
      },
    }
    return handler
  }

  /**
   * Find a matching handler for the request
   * @private
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @returns {Object|null} Matching handler or null
   */
  _findHandler(method, url) {
    const handlers = this.handlers[method]
    for (let i = handlers.length - 1; i >= 0; i -= 1) {
      const handler = handlers[i]
      if (this._urlMatches(handler.url, url)) {
        return handler
      }
    }
    return null
  }

  /**
   * Check if URL pattern matches request URL
   * @private
   * @param {string|RegExp|undefined} pattern - URL pattern
   * @param {string} url - Request URL
   * @returns {boolean} True if matches
   */
  _urlMatches(pattern, url) {
    if (pattern === undefined || pattern === null) {
      return true
    }
    if (pattern instanceof RegExp) {
      return pattern.test(url)
    }
    return pattern === url
  }

  /**
   * Get a mocked response for a request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @returns {Object} Mock response object with status, data, and headers
   */
  getMockResponse(method, url, options = {}) {
    const handler = this._findHandler(method.toLowerCase(), url)
    if (!handler) {
      throw new Error(`No mock handler registered for ${method} ${url}`)
    }
    const requestConfig = {
      url,
      method,
      params: options.params,
      headers: options.headers,
      data: options.body,
    }
    if (handler.generator) {
      const res = handler.generator(requestConfig)
      // handle axios-style `[status, data, headers]`input as expected
      if (Array.isArray(res)) {
        return {
          status: res[0] ?? 200,
          data: res[1] === undefined ? null : res[1],
          headers: res[2] || {},
        }
      }
      // generator may return full response object or just data
      if (res && typeof res === "object" && ("status" in res || "data" in res || "headers" in res)) {
        return {
          status: res.status || 200,
          data: res.data || null,
          headers: res.headers || {},
        }
      }
      return {
        status: 200,
        data: res,
        headers: {},
      }
    }

    return {
      status: handler.status,
      data: handler.data,
      headers: handler.headers,
    }
  }

  /**
   * Reset all registered handlers
   */
  resetHandlers() {
    this.handlers = {
      get: [],
      post: [],
      delete: [],
    }
  }
}

export default HttpMockAdapter
