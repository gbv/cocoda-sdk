import path from "path"
import fs from "fs"
import MockAdapter from "axios-mock-adapter"

/**
 * Mock simple HTTP responses with status 200 and JSON content.
 */
export function mockRequests(axios, config, requests) {
  const mock = new MockAdapter(axios)
  const missing = new Set()
  const dir = config.dir || "./"

  mock.onAny().reply(async ({ url, params }) => {
    params = new URLSearchParams(params)
    if (params.size) {
      url = `${url}?${params}`
    }

    if (config.debug) {
      console.log(`HTTP Request: ${url}`)
    }

    let file = requests[url]
    if (file) {
      file = path.join(dir, file)
      if (!fs.existsSync(file)) {
        if (config.downloadMissing) {
          const res = await fetch(url)
          if (res.ok) {
            fs.writeFileSync(file, JSON.stringify(await res.json(), null, 2))
          } else {
            console.error(`Failed to download ${url}: ${res.status}`)
          }
        } else {
          missing.add(url)
          return [404, { error: `Not found: ${url}` }]
        }
      }
      return [200, JSON.parse(fs.readFileSync(file, "utf-8"))]
    } else {
      missing.add(url)
      return [404, { error: `Not mocked: ${url}` }]
    }
  })

  return missing
}
