var _ = require('lodash');
var PromiseQueue = require('promise-queue');

var config = require('./config.json');

var PhantomContainer = require('./lib/phantom-container.js');
var FetchPromise = require('./lib/fetch-promise.js');
var Logger = require('./lib/logger.js');
var URL = require('./lib/url.js');
var getUrl = function (str) {
  var url = str.match(/(https?:\/\/)[\w-+:_.~@%#?,&=\/\\]+/);
  return url ? url[0] : null;
};

function main(selector, input, options) {
  options = _.defaults(options, config.defaults, {input: input, selector: selector});

  return new Promise(function (resolve) {
    var lines = options.input;

    var urls = lines.map(function (line, i) {
      return new URL(getUrl(line), {lineNumber: i}, {attempts: options.attempts, selector: options.selector});
    }).filter(function (url) {
      return url.address;
    });

    var browsers = [];

    for (var i = 0; i < options.parallelization; i += 1) {
      browsers.push(new PhantomContainer({fetchTimeout: options.timeout}));
    }

    var queue = new PromiseQueue(options.parallelization);

    var logger = Logger(queue,
      {verbose: options.verbose, totalUrls: urls.length, errorsAreOk: !options.rejectFailures});

    new Promise(function (resolve) {
      urls.forEach(function (url) {
        queue.add(function () {
          logger(url, 'started');
          return FetchPromise(url, browsers, logger);
        }).then(function (url) {
          processUrl(url);
        }).catch(function () {
          processUrl(url);
        });
      });

      function processUrl(url) {
        if (url.error ? options.rejectFailures : !url.isOk()) {
          lines[url.data.lineNumber] = null;
        }

        if ((queue.getPendingLength() + queue.getQueueLength()) === 0) {
          resolve();
        }
      }
    }).then(function () {
      var data = lines.filter(function (line) {
        return line !== null && (!options.urlsOnly || getUrl(line));
      });

      browsers.forEach(function (b) {
        b.kill();
      });

      resolve(data);
    });
  });
}

module.exports = main;
