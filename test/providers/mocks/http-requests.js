import path from "path"
import fs from "fs"

export function mockHttpRequests(http, config, requests) {
  const missing = new Set()
  const dir = config.dir || "./"

  const originalFetch = http.fetch

  http.setAdapter(async (url, options = {}) => {

    let fullUrl = buildUrl(url, options.params)


    if (options.method && (options.method !== "GET" && options.method !== "get")) {
      fullUrl = options.method + " " + fullUrl
    }
    if (config.debug) {
      console.log(`HTTP Request: ${fullUrl}`)
    }

    let file = requests[fullUrl]

    if (file) {
      file = path.join(dir, file)

      if (!fs.existsSync(file)) {
        if (config.downloadMissing) {
          const res = await originalFetch(url, options)

          if (res.ok) {
            fs.writeFileSync(
              file,
              JSON.stringify(await res.json(), null, 2),
            )
          } else {
            console.error(
              `Failed to download ${url}: ${res.status}`,
            )
          }
        } else {
          missing.add(fullUrl)

          return new Response(
            JSON.stringify({
              error: `Not found: ${fullUrl}`,
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        }
      }

      return new Response(
        JSON.stringify(
          JSON.parse(fs.readFileSync(file, "utf-8")),
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    missing.add(fullUrl)

    return new Response(
      JSON.stringify({
        error: `Not mocked: ${fullUrl}`,
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  })

  return missing
}

function buildUrl(url, params = {}) {
  const fullUrl = new URL(url, "http://localhost")

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      fullUrl.searchParams.append(key, value)
    }
  })

  return fullUrl.toString()
}