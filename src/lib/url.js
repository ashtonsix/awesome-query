var _ = require('lodash');

function URL(address, data, options) {
  var self = this;

  this.address = address;
  this.attempts = options.attempts;
  this.data = {};

  _.forOwn(data, function (val, key) {
    self.data[key] = val;
  });

  this.isOk = function () {
    try {
      return this.page.text.indexOf(options.regex) !== -1;
    } catch (e) {
      return options.errorsAreOk;
    }
  };
}

module.exports = URL;
