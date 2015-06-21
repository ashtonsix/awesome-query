// Find a browser available to fetch the URL and fetch it

var _ = require('lodash');

function FetchPromise(url, browsers, logger) {
  return new Promise(function (resolve, reject) {
    var b = _.findWhere(browsers, {available: true});
    if (!b) {
      setTimeout(function () {
        resolveFetchPromise();
      }, 1000);
    } else {
      b.fetch(url).then(function (result) {
        url.page = result;
        logger(url, 'completed');
        resolve(url);
      }).catch(function (err) {
        url.attempts -= 1;

        if (url.attempts > 0) {
          logger(url, 'retrying', err);
          resolveFetchPromise();
        } else {
          logger(url, 'failed', err);
          url.error = err;
          reject(url);
        }
      });
    }

    function resolveFetchPromise() {
      FetchPromise(url, browsers, logger).then(function (result) {
        resolve(result);
      }).catch(function (err) {
        reject(err);
      });
    }
  });
}

module.exports = FetchPromise;
