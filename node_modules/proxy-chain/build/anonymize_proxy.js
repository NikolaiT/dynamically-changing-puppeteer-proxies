'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.closeAnonymizedProxy = exports.anonymizeProxy = undefined;

var _server = require('./server');

var _tools = require('./tools');

// Dictionary, key is value returned from anonymizeProxy(), value is Server instance.
var anonymizedProxyUrlToServer = {};

/**
 * Parses and validates a HTTP proxy URL. If the proxy requires authentication, then the function
 * starts an open local proxy server that forwards to the upstream proxy.
 * @param proxyUrl
 * @param callback Optional callback that receives the anonymous proxy URL
 * @return If no callback was supplied, returns a promise that resolves to a String with
 * anonymous proxy URL or the original URL if it was already anonymous.
 */
var anonymizeProxy = exports.anonymizeProxy = function anonymizeProxy(proxyUrl, callback) {
    var parsedProxyUrl = (0, _tools.parseUrl)(proxyUrl);
    if (!parsedProxyUrl.host || !parsedProxyUrl.port) {
        throw new Error('Invalid "proxyUrl" option: the URL must contain both hostname and port.');
    }
    if (parsedProxyUrl.scheme !== 'http') {
        throw new Error('Invalid "proxyUrl" option: only HTTP proxies are currently supported.');
    }

    // If upstream proxy requires no password, return it directly
    if (!parsedProxyUrl.username && !parsedProxyUrl.password) {
        return (0, _tools.nodeify)(Promise.resolve(proxyUrl), callback);
    }

    var server = void 0;

    var startServer = function startServer() {
        return Promise.resolve().then(function () {
            server = new _server.Server({
                // verbose: true,
                port: 0,
                prepareRequestFunction: function prepareRequestFunction() {
                    return {
                        requestAuthentication: false,
                        upstreamProxyUrl: proxyUrl
                    };
                }
            });

            return server.listen();
        });
    };

    var promise = startServer().then(function () {
        var url = 'http://127.0.0.1:' + server.port;
        anonymizedProxyUrlToServer[url] = server;
        return url;
    });

    return (0, _tools.nodeify)(promise, callback);
};

/**
 * Closes anonymous proxy previously started by `anonymizeProxy()`.
 * If proxy was not found or was already closed, the function has no effect
 * and its result if `false`. Otherwise the result is `true`.
 * @param anonymizedProxyUrl
 * @param closeConnections If true, pending proxy connections are forcibly closed.
 * If `false`, the function will wait until all connections are closed, which can take a long time.
 * @param callback Optional callback
 * @returns Returns a promise if no callback was supplied
 */
var closeAnonymizedProxy = exports.closeAnonymizedProxy = function closeAnonymizedProxy(anonymizedProxyUrl, closeConnections, callback) {
    if (typeof anonymizedProxyUrl !== 'string') {
        throw new Error('The "anonymizedProxyUrl" parameter must be a string');
    }

    var server = anonymizedProxyUrlToServer[anonymizedProxyUrl];
    if (!server) {
        return (0, _tools.nodeify)(Promise.resolve(false), callback);
    }

    delete anonymizedProxyUrlToServer[anonymizedProxyUrl];

    var promise = server.close(closeConnections).then(function () {
        return true;
    });
    return (0, _tools.nodeify)(promise, callback);
};