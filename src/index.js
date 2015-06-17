var yargs = require('yargs')
  .option('v', {alias: 'verbose', boolean: true})
  .option('r', {alias: 'reject-failures', boolean: true})
  .option('m', {alias: 'selector-is-module', boolean: true,
    describe: 'Intepret selector as node module'}) // not implemented
  .option('u', {alias: 'urls-only', boolean: true,
    describe: 'Remove lines without URLs'})
  .option('t', {alias: 'timeout', default: 20000, nargs: 1,
    describe: '<INTEGER> how long to spend waiting for webpage to load'})
  .option('a', {alias: 'attempts', default: 3, nargs: 1,
    describe: '<INTEGER> how many times to retry loading failed webpage'})
  .option('p', {alias: 'parallelization', default: 8, nargs: 1,
    describe: '<INTEGER> how many browsers should be concurrently loading webpages'})
  .option('s', {alias: 'selector', default: 'string', nargs: 1, string: true,
    describe: 'One of [string, url, file, pipe]'}) // not implemented
  .option('i', {alias: 'input', default: 'file', nargs: 1,
    describe: 'One of [string, url, file, pipe]'}) // not implemented
  .option('o', {alias: 'output', default: 'file', nargs: 1,
    describe: 'One of [file, stdout]'})
  .usage('Usage: <selector> <input> <output> [OPTIONS]')
  .demand(3); // remove when validate is implemented

var parseOptions = require('./lib/parse-options.js');

if (!parseOptions.validate(yargs)) {
  yargs.showHelp();
  process.exit();
}

var PromiseQueue = require('promise-queue');
var phridge = require('phridge');
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

parseOptions(yargs).then(main);

function main(argv) {
  var lines = fs.readFileSync(argv._[1], 'utf8').split('\n');

  var urls = lines.map(function (line, i) {
    return new URL(getUrl(line), {lineNumber: i}, {attempts: argv.attempts, regex: argv._[0]});
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
        processUrl();
      });
    });

    function processUrl(url) {
      if (url ? !url.isOk() : argv['reject-failures']) {
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
      fs.writeFile(argv._[2], data, function (err) {
        if (err) {
          return console.error(err);
        }

        console.log('\nComplete. Output saved to ' + argv._[2]);

        handleExit();
      });
    } else if (argv.output === 'stdout') {
      console.log('\n---\n' + data + '\n---');
      console.log('\nComplete. Output saved to ' + argv._[2]);

      handleExit();
    }
  });
}
