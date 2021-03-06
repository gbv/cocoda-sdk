const lint = require("mocha-eslint")

// ESLint as part of the tests
let paths = [
  "**/*.js",
  "**/.*.js",
  "!dist/**/*.js",
  "!node_modules/**/*.js",
  "!node_modules/**/.*.js",
]
let options = {
  contextName: "ESLint",
}
lint(paths, options)
