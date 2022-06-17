import lint from "mocha-eslint"

// ESLint as part of the tests
let paths = [
  "**/*.js",
  "**/.*.js",
  "!dist/**/*.js",
  "!out/**/*.js",
  "!node_modules/**/*.js",
  "!node_modules/**/.*.js",
]
let options = {
  contextName: "ESLint",
}
lint(paths, options)
