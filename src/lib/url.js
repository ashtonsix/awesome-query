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
      if (options.selector.constructor.name === 'RegExp') {
        return !!this.page.text.match(options.selector);
      }

      return options.selector(this.page);
    } catch (e) {
      return options.errorsAreOk;
    }
  };
}

module.exports = URL;
