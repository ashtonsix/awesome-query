var RSVP = require('rsvp');
var fs = require('fs');
var _ = require('lodash');

var PhantomContainer = require('./phantom-container.js');

function parseOptions(yargs) {
  var argv = yargs.argv;

  return new Promise(function (resolve, reject) {
    RSVP.hash({
      selector: getInput(argv.selector, argv._[0]),
      input: getInput(argv.input, argv._[argv.selector === 'pipe' ? 0 : 1])
    }).then(function (args) {
      var result = _.cloneDeep(argv);

      if (argv['selector-is-module']) {
        result.selector = requireFromString(args.selector);
      } else {
        result.selector = new RegExp(args.selector);
      }
      result.input = args.input;
      if (argv.output === 'file') {
        result.outputLocation = argv._[argv._.length - 1];
      }
      delete result._;

      resolve(result);
    }).catch(function (err) {
      reject(err);
    });
  });
}

parseOptions.validate = function (yargs) {
  var argv = yargs.argv;
  var numberOfPipedVariables = (isPipe('selector') ? 1 : 0) + (isPipe('input') ? 1 : 0);
  var numberOfDesiredArguments = (2 - numberOfPipedVariables) + (argv.output === 'file' ? 1 : 0);

  if (argv.timeout < 0 || !isInteger(argv.timeout)) {
    return 'timeout is not an integer';
  } if (argv.attempts < 1 || !isInteger(argv.attempts)) {
    return 'attempts is not an integer';
  } if (argv.parallelization < 1 || !isInteger(argv.parallelization)) {
    return 'parallelization is not an integer';
  } if (!isValidInputMethod('selector')) {
    return 'selector method is not valid';
  } if (!isValidInputMethod('input')) {
    return 'input method is not valid';
  } if (numberOfPipedVariables > 1) {
    return 'can only set one value to pipe';
  } if (argv.output !== 'file' && argv.output !== 'stdout') {
    return 'output method is incorrect';
  } if (argv._.length !== numberOfDesiredArguments) {
    return 'correct number of sequential arguments';
  }

  return null;

  function isInteger(val) {
    return val.constructor.name === 'Number' && val % 1 === 0;
  }

  function isPipe(arg) {
    return argv[arg] === 'pipe';
  }

  function isValidInputMethod(arg) {
    var a = argv[arg];
    return a === 'string' || a === 'url' || a === 'file' || a === 'pipe';
  }
};

function getInput(fieldMethod, fieldData) {
  if (fieldData && fieldData.constructor.name === 'Number') {
    fieldData = fieldData.toString(); // eslint-disable-line
  }

  return new Promise(function (resolve, reject) {
    new Promise(function (resolve, reject) {
      if (fieldMethod === 'string') {
        resolve(fieldData);
      } else if (fieldMethod === 'file') {
        fs.readFile(fieldData, 'utf8', function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      } else if (fieldMethod === 'url') {
        var browser = new PhantomContainer({fetchTimeout: 20000});

        browser.fetch(fieldData)
          .then(function (data) {
            browser.kill();
            resolve(data.text);
          }).catch(function (err) {
            browser.kill();
            reject(err);
          });
      } else if (fieldMethod === 'pipe') {
        var data = '';

        process.stdin.on('readable', function () {
          data += this.read();
        });

        process.stdin.on('end', function () {
          resolve(data);
        });
      }
    }).then(function (data) {
      resolve(data.split('\n'));
    }).catch(function (err) {
      if (err.name === 'TimeoutError') {
        console.error(fieldData + ' timed out');
      } else {
        console.error('There was an error while loading ' + fieldData);
      }
      reject(err);
    });
  });
}

function requireFromString(src, filename) {
  var m = new module.constructor();
  m.paths = module.paths;
  m._compile(src, filename);
  return m.exports;
}

module.exports = parseOptions;
