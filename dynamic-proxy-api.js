const express = require('express');
const bodyParser = require('body-parser');
const validUrl = require('valid-url');
const puppeteer = require('puppeteer-core');
const ProxyChain = require('proxy-chain');

const CHROME_BINARY_PATH = '/usr/bin/chromium-browser';
const app = express();
const port = 3333;
const proxyServerPort = 8947;
let browser = null;

app.use(express.json());
app.use(bodyParser.json({ limit: '2mb' }));

function log(msg) {
  console.log(`[${(new Date()).getTime()}] - ${msg}`);
}

function validateProxy(proxy) {
  let match = false;
  let prefixes = ['http://', 'https://', 'socks://', 'socks5://', 'socks4://'];
  for (let prefix of prefixes) {
    if (proxy.startsWith(prefix)) {
      match = true;
    }
  }
  if (match === false) {
    return false;
  }
  return validUrl.isWebUri(proxy);
}

async function getBrowser() {
  if (browser === null) {
    browser = await puppeteer.launch({
      executablePath: CHROME_BINARY_PATH,
      headless: false,
      args: [`--proxy-server=http://localhost:` + proxyServerPort],
    });
    log('Browser started');
  }
}

async function startProxyServer(proxy) {
  return new Promise(function(resolve, reject) {
    const server = new ProxyChain.Server({
      port: proxyServerPort,
      verbose: false,
      prepareRequestFunction: function (params) {
        var {request, username, password, hostname, port, isHttp, connectionId} = params;
        return {
          requestAuthentication: false,
          // http://username:password@proxy.example.com:3128
          upstreamProxyUrl: proxy,
        };
      },
    });

    // Emitted when HTTP connection is closed
    server.on('connectionClosed', (params) => {
      var {connectionId, stats} = params;
      log(`Connection ${connectionId} closed`);
    });

    // Emitted when HTTP request fails
    server.on('requestFailed', (params) => {
      var {request, error} = params;
      log(`Request ${request.url} failed with error ${error}`);
    });

    server.listen(() => {
      log(`ProxyServer listening on port ${server.port}`);
      resolve(server);
    });
  });
}

async function clearCookies(page) {
  try {
    log('Deleting cookies with Network.clearBrowserCookies');
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  } catch (err) {
    log(`Could not delete cookies: ${err.toString()}`);
  }
}

app.get('/api', async (req, res) => {
  if (req.query.proxy) {
    if (!validateProxy(req.query.proxy)) {
      return res.status(403).send('Invalid proxy format');
    } else {
      log(`Using proxy: ${req.query.proxy}`);
    }
  }

  if (req.query.url) {
    if (!validUrl.isWebUri(req.query.url)) {
      return res.status(403).send(`url is not valid`);
    }
  } else {
    return res.status(403).send(`url is required`);
  }

  let proxyServer = await startProxyServer(req.query.proxy);

  await getBrowser();
  let page = await browser.newPage();
  await page.goto(req.query.url, { waitUntil: "domcontentloaded" });
  let content = await page.content();
  // clear cookies after we are done
  await clearCookies(page);

  proxyServer.close();
  await page.close();

  res.set('Content-Type', 'text/html');
  return res.send(Buffer.from(content));
});

app.listen(port, () => {
  log(`Dynamic proxy puppeteer Api listening on port ${port}`);
});