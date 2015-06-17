function parseOptions(yargs) {
  // reorder / rename / process sequential arguments to account for piping and stdout option
  var cb;
  var result = yargs.argv;

  setTimeout(function () {
    if (cb) {
      cb(result);
    }
  }, 10);

  return {
    then: function (callback) {
      cb = callback;
    }
  };
}

parseOptions.validate = function () {
  // Assertions
  //
  // Integers are integers >= 1 (0 for timeout)
  // If selector-is-module ensure it returns boolean when given string
  // If !selector-is-module ensure it is valid regex
  // -s, -i & -o are one of 4 settings
  // Pipe is enabled for one or zero options
  // 1 to 3 sequential paramters depending on whether pipe is enabled, and stdout are enabled

  return true;
};

// function requireFromString(src, filename) {
//   var m = new module.constructor();
//   m.paths = module.paths;
//   m._compile(src, filename);
//   return m.exports;
// }

module.exports = parseOptions;
