const errors = require("../errors")
const BaseProvider = require("./base-provider")

let providers = {
  [BaseProvider.providerName]: BaseProvider,
}

function addProvider(provider) {
  if (provider.prototype instanceof providers[BaseProvider.providerName]) {
    providers[provider.providerName] = provider
  } else {
    throw new errors.InvalidProviderError()
  }
}

providers.addProvider = addProvider

for (let provider of [
  require("./local-mappings-provider"),
  require("./mappings-api-provider"),
  require("./occurrences-api-provider"),
  require("./concept-api-provider"),
  require("./reconciliation-api-provider"),
  require("./search-suggestion-provider"),
  require("./skosmos-api-provider"),
]) {
  addProvider(provider)
}

module.exports = providers
