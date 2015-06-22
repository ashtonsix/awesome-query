#!/usr/bin/env node

var fs = require('fs');

var config = require('../config.json');
var main = require('../index.js');
var handleExit = require('../lib/handle-exit.js');
var parseOptions = require('../lib/parse-options.js');

var yargs = require('yargs')
  .option('verbose', {alias: 'v', boolean: true})
  .option('reject-failures', {alias: 'r', boolean: true})
  .option('urls-only', {alias: 'u', boolean: true,
    describe: 'Remove lines without URLs'})
  .option('timeout', {alias: 't', default: config.defaults.timeout, nargs: 1,
    describe: '<INTEGER> how long to spend waiting for webpage to load'})
  .option('attempts', {alias: 'a', default: config.defaults.attempts, nargs: 1,
    describe: '<INTEGER> how many times to retry loading failed webpage'})
  .option('parallelization', {alias: 'p', default: config.defaults.parallelization, nargs: 1,
    describe: '<INTEGER> how many browsers should be concurrently loading webpages'})
  .option('selector', {alias: 's', default: config.parseMethods.selector, nargs: 1, string: true,
    describe: 'One of [string, url, file, pipe]'})
  .option('input', {alias: 'i', default: config.parseMethods.input, nargs: 1,
    describe: 'One of [string, url, file, pipe]'})
  .option('output', {alias: 'o', default: config.parseMethods.output, nargs: 1,
    describe: 'One of [file, stdout, none]'})
  .usage('Usage: <selector> <input> <output> [OPTIONS]')
  .wrap(null);

if (parseOptions.validate(yargs.argv)) {
  yargs.showHelp();
  console.log('Error: ' + parseOptions.validate(yargs.argv));
  process.exit();
}

process.on('exit', handleExit);

parseOptions(yargs.argv).then(function (options) {
  main(options.selector, options.input, options).then(function (data) {
    data = data.join('\n');
    if (options.outputMethod === 'file') {
      fs.writeFile(options.outputLocation, data, function (err) {
        if (err) {
          return console.error(err);
        }

        console.log('\nComplete. Output saved to ' + options.outputLocation);
      });
    } else if (options.outputMethod === 'stdout') {
      console.log('\n---\n' + data + '\n---');
    }

    handleExit();
  });
}).catch(handleExit);
