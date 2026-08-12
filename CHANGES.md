# 3.8.2

The 3.8.x releases are intermediate release for testing. In doubt, keep at version 3.7.0.

- Extend MOD API, in particular by addition of getRegistries
- Continue migration from axios to fetch
- Update dependencies

# 3.8.1

- Hotfix for use of fetch in the browser

# 3.8.0

- Replace axios with native fetch
- Add MeSH API provider
- Add generic timeout parameter
- Update jskos-tools to 1.3.0

# 3.7.0

- Remove addition of mapping identifiers in `adjustMapping`, called in methods `getMapping`, `getMappings`, `postMapping`, `postMappings`, `putMapping`, `putMapping`, `patchMapping`. Clients MUST take care to add identifiers with function `addMappingIdentifiers` from jskos-tools, if needed.
- Fix `isAuthorizedFor`
