module.exports = {
  env: {
    node: true,
    mocha: true,
    es2022: true,
    browser: true,
  },
  extends: ["gbv"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2022,
  },
}
