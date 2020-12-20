### Changing Puppeteer Proxy Dynamically

Setup:

```
npm i puppeteer-core express body-parser valid-url proxy-chain
```

and then run:

```
node dynamic-proxy-api.js
```

Then make a request to the Api like this:

```bash
curl -i "http://localhost:3333/api?url=http://httpbin.org/get&proxy=http://11.22.33.44:1234/"
```