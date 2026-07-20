This directory contains test files for mocking HTTP response body and checking expected JSKOS in unit tests.

OLS API responses have been retrieved as following.

Two ontologies and one specific SKOS terminology:

~~~sh
curl -s https://api.terminology.tib.eu/api/v2/ontologies?size=2 | jq > ontologies.json
curl -s -G --data-urlencode search=http://uri.gbv.de/terminology/bk/ https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri | jq > bk.json 
~~~

Top elements of an ontology. Both classes and properties must be queried to get all top elements!

~~~
curl -s https://api.terminology.tib.eu/api/v2/ontologies/bfo/classes?hasDirectParents=false | jq > bfo-root-classes.json
curl -s 'https://api.terminology.tib.eu/api/v2/ontologies/bfo/properties?hasDirectParents=false' | jq > bfo-root-properties.json
~~~

For SKOS vocabularies retrieving hierarchy does not work properly. OLS is not meant to host SKOS vocabularies anyway!

---

To make sure JSKOS examples are valid JSKOS, run:

~~~sh
npm run --silent validate -- scheme $(pwd)/get-schemes.jskos.json
npm run --silent validate -- scheme $(pwd)/get-schemes-bk.jskos.json
npm run --silent validate -- concept $(pwd)/*.concepts.json
~~~
