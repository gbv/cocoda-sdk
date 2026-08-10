import { providers } from "../src/index.js"

const provider = new providers.ModApiProvider({
  endpoint: "https://terminology.services.base4nfdi.de/api-gateway/",
})

const registries = await provider.getRegistries()

console.log(JSON.stringify(registries,0,4))
