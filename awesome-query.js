/* eslint vars-on-top:0, no-shadow:0, no-use-before-define:0, no-reserved-keys:0 */

var yargs = require('yargs')
  .option('v', {alias: 'verbose', boolean: true})
  .option('r', {alias: 'reject-failures', boolean: true})
  .option('m', {alias: 'selector-is-module', boolean: true,
    describe: 'Intepret selector as node module'})
  .option('t', {alias: 'timeout', default: 20000, nargs: 1,
    describe: '<INTEGER> how long to spend waiting for webpage to load'})
  .option('a', {alias: 'attempts', default: 3, nargs: 1,
    describe: '<INTEGER> how many times to retry loading failed webpage'})
  .option('p', {alias: 'parallelization', default: 8, nargs: 1,
    describe: '<INTEGER> how many browsers should be concurrently loading webpages'})
  .option('s', {alias: 'selector', default: 'string', nargs: 1, string: true,
    describe: 'One of [string, url, file, pipe]'})
  .option('i', {alias: 'input', default: 'file', nargs: 1,
    describe: 'One of [string, url, file, pipe]'})
  .option('o', {alias: 'output', default: 'file', nargs: 1,
    describe: 'One of [file, stdout]'})
  .usage('Usage: <selector> <input> <output> [OPTIONS]')
  .demand(3); // remove when validate is implemented

var argv = yargs.argv;
var phridge = require('phridge');
Promise.Queue = require('promise-queue');

// validate has not been implemented yet
if (!validate(argv)) {
  yargs.showHelp();
  process.exit();
}

var fs = require('fs');
var _ = require('lodash');
var getUrl = function (str) {
  var url = str.match(/(https?:\/\/)[\w-+:_.~@%#?,&=\/\\]+/);
  return url ? url[0] : null;
};

var lines = fs.readFileSync(argv._[1], 'utf8').split('\n');

var urls = lines.map(function (line, i) {
  return new URL(getUrl(line), {lineNumber: i});
}).filter(function (url) {
  return url.address;
});

var browsers = [];

for (var i = 0; i < argv.parallelization; i += 1) {
  browsers.push(new PhantomContainer());
}

var queue = new Promise.Queue(argv.parallelization);

var logger = Logger(queue);

new Promise(function (resolve) {
  urls.forEach(function (url) {
    queue.add(function () {
      logger(url, 'started');
      return FetchPromise(url, browsers);
    }).then(function (url) {
      var urlIsOk;
      try {
        urlIsOk = url.isOk(url.page);
      } catch (e) {
        urlIsOk = !argv['reject-failures'];
      }

      if (!urlIsOk) {
        lines[url.data.lineNumber] = null;
      }

      if ((queue.getPendingLength() + queue.getQueueLength()) === 0) {
        resolve();
      }
    }).catch(function () {
      if (argv['reject-failures']) {
        lines[url.data.lineNumber] = null;
      }

      if ((queue.getPendingLength() + queue.getQueueLength()) === 0) {
        resolve();
      }
    });
  });
}).then(function () {
  var data = lines.filter(function (line) {
    return line !== null;
  }).join('\n');

  fs.writeFile(argv._[2], data, function (err) {
    if (err) {
      return console.error(err);
    }

    console.log('Complete. Output saved to ' + argv._[2]);

    handleExit();
  });
});

process.on('exit', handleExit);

function handleExit() {
  try {
    phridge.disposeAll().then(function () {
      process.exit(0);
    }).catch(function (err) {
      throw err;
    });
  } catch (e) {
    process.exit(0);
  }
}

function PhantomContainer() {
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
        reject({name: 'NotReadyError', message: 'An unavailable browser was requested to fetch ' + url});
      }

      self.available = false;

      var page = self.phantom.createPage();
      page.run(url.address, argv.timeout / 4, function (address, loadDuration, resolve, reject) {
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
              return reject({name: 'NonExistentPageError', message: 'Page does not exist or was deleted'});
            }

            if (result === null || !result.html) {
              reject({name: 'InvalidDataError', message: address + ' returned null content'});
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
      }, argv.timeout);
    }).then(function (data) {
      self.available = true;
      return data;
    });
  };

  this.kill = function () {
    if (!this.phantom) {
      throw {name: 'NonExistentProcessError', message: 'Process does not exist or has not been created yet'};
    }

    this.phantom.kill();
  };
}

// Find a browser available to fetch the URL and fetch it
function FetchPromise(url, browsers) {
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
          reject(err);
        }
      });
    }

    function resolveFetchPromise() {
      FetchPromise(url, browsers).then(function (result) {
        resolve(result);
      }).catch(function (err) {
        reject(err);
      });
    }
  });
}

function Logger(queue) {
  var charm = require('charm')();
  charm.pipe(process.stdout);

  queue.completedLength = 0;

  if (!argv.verbose) {
    process.stdout.write('(0/' + urls.length + ' done)\n');
  }

  function log(url, action, err) {
    if (action === 'completed' || action === 'failed') {
      queue.completedLength += 1;
    }

    if (argv.verbose) {
      if (process.stdout.isTTY) {
        charm.display('dim');
      }
      process.stdout.write(url.address + ' ');
      if (process.stdout.isTTY) {
        charm.display('reset');
      }
      if (action === 'retrying') {
        process.stdout.write('failed, retrying (' + url.attempts + ' attempts remaining) ');
      } else {
        process.stdout.write(action + ' ');
      }
      if (err) {
        process.stdout.write('[' + (err.name || err.constructor.name) + ', ' + err.message + '] ');
      }
    } else if (process.stdout.isTTY) {
      charm.up(1);
    }

    process.stdout.write('(' + queue.completedLength + '/' + urls.length + ' done)\n');
  }

  return log;
}

function URL(address, data) {
  var self = this;

  this.address = address;
  this.attempts = argv.attempts;
  this.data = {};

  _.forOwn(data, function (val, key) {
    self.data[key] = val;
  });

  this.isOk = function () {
    return this.page.text.indexOf(argv._[0]) !== -1;
  };
}

function validate() {
  // Assertions
  //
  // Integers are integers >= 1 (0 for timeout)
  // If selector-is-module ensure it returns boolean when given string
  // If !selector-is-module ensure it is valid regex
  // -s, -i & -o are one of 4 settings
  // Pipe is enabled for one or zero options
  // 1 to 3 sequential paramters depending on whether pipe is enabled, and stdout are enabled

  return true;
}
