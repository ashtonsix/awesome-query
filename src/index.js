var yargs = require('yargs')
  .option('verbose', {alias: 'v', boolean: true})
  .option('reject-failures', {alias: 'r', boolean: true})
  .option('selector-is-module', {alias: 'm', boolean: true,
    describe: 'Intepret selector as node module'})
  .option('urls-only', {alias: 'u', boolean: true,
    describe: 'Remove lines without URLs'})
  .option('timeout', {alias: 't', default: 20000, nargs: 1,
    describe: '<INTEGER> how long to spend waiting for webpage to load'})
  .option('attempts', {alias: 'a', default: 3, nargs: 1,
    describe: '<INTEGER> how many times to retry loading failed webpage'})
  .option('parallelization', {alias: 'p', default: 8, nargs: 1,
    describe: '<INTEGER> how many browsers should be concurrently loading webpages'})
  .option('selector', {alias: 's', default: 'string', nargs: 1, string: true,
    describe: 'One of [string, url, file, pipe]'})
  .option('input', {alias: 'i', default: 'file', nargs: 1,
    describe: 'One of [string, url, file, pipe]'})
  .option('output', {alias: 'o', default: 'file', nargs: 1,
    describe: 'One of [file, stdout]'})
  .usage('Usage: <selector> <input> <output> [OPTIONS]')
  .wrap(null);

var parseOptions = require('./lib/parse-options.js');

if (parseOptions.validate(yargs)) {
  yargs.showHelp();
  console.log('Error: ' + parseOptions.validate(yargs));
  process.exit();
}

var PromiseQueue = require('promise-queue');
var fs = require('fs');

var PhantomContainer = require('./lib/phantom-container.js');
var FetchPromise = require('./lib/fetch-promise.js');
var handleExit = require('./lib/handle-exit.js');
var Logger = require('./lib/logger.js');
var URL = require('./lib/url.js');
var getUrl = function (str) {
  var url = str.match(/(https?:\/\/)[\w-+:_.~@%#?,&=\/\\]+/);
  return url ? url[0] : null;
};

process.on('exit', handleExit);

parseOptions(yargs).then(main).catch(handleExit);

function main(argv) {
  var lines = argv.input;

  var urls = lines.map(function (line, i) {
    return new URL(getUrl(line), {lineNumber: i}, {attempts: argv.attempts, selector: argv.selector});
  }).filter(function (url) {
    return url.address;
  });

  var browsers = [];

  for (var i = 0; i < argv.parallelization; i += 1) {
    browsers.push(new PhantomContainer({fetchTimeout: argv.timeout}));
  }

  var queue = new PromiseQueue(argv.parallelization);

  var logger = Logger(queue, {verbose: argv.verbose, totalUrls: urls.length, errorsAreOk: !argv['reject-failures']});

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
      if (url.error ? argv['reject-failures'] : !url.isOk()) {
        lines[url.data.lineNumber] = null;
      }

      if ((queue.getPendingLength() + queue.getQueueLength()) === 0) {
        resolve();
      }
    }
  }).then(function () {
    var data = lines.filter(function (line) {
      return line !== null && (!argv['urls-only'] || getUrl(line));
    }).join('\n');

    if (argv.output === 'file') {
      fs.writeFile(argv.outputLocation, data, function (err) {
        if (err) {
          return console.error(err);
        }

        console.log('\nComplete. Output saved to ' + argv.outputLocation);

        handleExit();
      });
    } else if (argv.output === 'stdout') {
      console.log('\n---\n' + data + '\n---');

      handleExit();
    }
  });
}
