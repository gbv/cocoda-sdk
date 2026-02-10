This directory contains test files for mocking HTTP response body and checking expected JSKOS in unit tests.

OLS API responses have been retrieved as following:

~~~sh
curl -s https://api.terminology.tib.eu/api/v2/ontologies?size=2 | jq > ontologies.json
curl -s -G --data-urlencode search=http://uri.gbv.de/terminology/bk/ https://api.terminology.tib.eu/api/v2/ontologies?searchFields=iri | jq > bk.json 
~~~

To make sure JSKOS examples are valid JSKOS, run:

~~~sh
npm run --silent validate -- scheme $(pwd)/get-schemes.jskos.json
npm run --silent validate -- scheme $(pwd)/get-schemes-bk.jskos.json
~~~
