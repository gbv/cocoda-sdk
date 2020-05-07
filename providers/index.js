const errors = require("../errors")
const BaseProvider = require("./base-provider")

let providers = {
  [BaseProvider.providerName]: BaseProvider,
  init(registry) {
    if (this[registry.provider]) {
      return new this[registry.provider](registry)
    }
    throw new errors.InvalidProviderError()
  },
  addProvider(provider) {
    if (provider.prototype instanceof providers[BaseProvider.providerName]) {
      this[provider.providerName] = provider
    } else {
      throw new errors.InvalidProviderError()
    }
  },
}

for (let provider of [
  require("./local-mappings-provider"),
  require("./mappings-api-provider"),
  require("./occurrences-api-provider"),
  require("./concept-api-provider"),
  require("./reconciliation-api-provider"),
  require("./search-suggestion-provider"),
  require("./skosmos-api-provider"),
]) {
  providers.addProvider(provider)
}

module.exports = providers
