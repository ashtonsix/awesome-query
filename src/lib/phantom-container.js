var phridge = require('phridge');

function PhantomContainer(options) {
  var self = this;
  this.available = false;

  phridge.spawn({
    loadImages: false,
    ignoreSslErrors: true
  }).then(function (phantom) {
    self.phantom = phantom;
    self.available = true;
  });

  this.fetch = function (url) {
    return new Promise(function (resolve, reject) {
      if (!self.available) {
        reject({name: 'NotReadyError', message: 'An unavailable browser was asked to fetch ' + url.address});
      }

      self.available = false;

      var page = self.phantom.createPage();
      page.run(url.address, options.fetchTimeout / 4, function (address, loadDuration, resolve, reject) {
        var self = this;
        this.onError = function () {
          // Do nothing
        };

        this.open(address, function () {
          setTimeout(function () {
            var result;
            try {
              result = self.evaluate(function () {
                var meta = Array.prototype.slice.call(document.getElementsByTagName('meta') || []).map(function (tag) {
                  return {name: tag.name || tag.getAttribute('property') || tag.httpEquiv, content: tag.content};
                });

                return {
                  text: document.body.innerText,
                  html: document.body.innerHTML,
                  meta: meta
                };
              });
            } catch (e) {
              return reject({name: 'EvaluationError', message: 'Cannot evaluate ' + address});
            }

            if (result === null || !result.html) {
              reject({name: 'InvalidDataError', message: address + ' returned null as content'});
            } else {
              resolve(result);
            }
          }, loadDuration);
        });
      }).then(function (data) {
        page.dispose().then(function () {
          resolve(data);
        });
      }).catch(function (err) {
        reject(err);
      });

      setTimeout(function () {
        self.available = true;
        if (page.phantom) {
          page.dispose().then(function () {
            reject({name: 'TimeoutError', message: url.address + ' timed out'});
          });
        } else {
          reject({name: 'TimeoutError', message: url.address + ' timed out'});
        }
      }, options.fetchTimeout);
    }).then(function (data) {
      self.available = true;
      return data;
    });
  };

  this.kill = function () {
    this.phantom.dispose();
  };
}

module.exports = PhantomContainer;
