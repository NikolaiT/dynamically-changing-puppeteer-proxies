### Changing Puppeteer Proxy Dynamically

Blog post topic introduction here: https://incolumitas.com/2020/12/20/dynamically-changing-puppeteer-proxies/

Setup:

```
npm i puppeteer-core express body-parser valid-url proxy-chain
```

and then change the line in `dynamic-proxy-api.js` if necessary to point to your local chrome browser binary:

```
const CHROME_BINARY_PATH = '/usr/bin/chromium-browser';
```

and then run:

```
node dynamic-proxy-api.js
```

Then make a request to the Api by specifying the `url` and `proxy` parameter:

```bash
curl -i "http://localhost:3333/api?url=http://httpbin.org/get&proxy=http://11.22.33.44:1234/"
```

The above Api request will open a browser and visit the url with the proxy specified. All subsequent Api requests will re-use the already running browser. The proxy for requests can be changed without restarting the browser, which is not possible with vanilla puppeteer.