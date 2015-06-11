/* eslint vars-on-top:0 */

var events = require('events');
var spawn = require('child_process').spawn;
var path = require('path');
var RSVP = require('rsvp');
var fs = require('fs');

['.txt', '.md'].forEach(function (extension) {
  require.extensions[extension] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
  };
});

var eventEmitter = (new events.EventEmitter()).setMaxListeners(0);
var reg = /(((ftp|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/;
var lines = require('./conferences.txt').split('\n');

var numPromises = lines.filter(function (line) {
  return line.match(reg) !== null;
}).length;
var numResolved = 0;
var numTimedOut = 0;
var numActiveProcesses = 0;

function updateStatus() {
  process.stdout.write('\r' + numResolved + ' of ' + numPromises + ' URLs checked, ' + numTimedOut + ' timed out.');
}

updateStatus();

var promises = lines.map(function (line) {
  return new RSVP.Promise(function (resolve) {
    var url = line.match(reg);
    var retries = 1;

    var canceled = false;
    var completed = false;

    function startChild() {
      var data = '';
      var child = spawn('phantomjs', [path.join(__dirname, 'phantom.js'), url[0], '--load-images=no']);
      var timedOut = false;

      console.log(url[0] + ' started');

      child.stdout.on('data', function (chunk) {
        data += chunk;
      });

      child.stdout.on('end', function () {
        if (!canceled && !completed && !timedOut) {
          child.kill();
          completed = true;
          numResolved += 1;
          numActiveProcesses -= 1;
          eventEmitter.emit('processFinished');
          updateStatus();
          resolve(data.indexOf('2015') !== -1);
        }
      });

      setTimeout(function () {
        timedOut = true;
        child.kill();
        if (!canceled && !completed) {
          if (retries) {
            console.log(url[0] + ' failed, retrying (' + retries + ' attempts left)');
            retries -= 1;
            startChild();
          } else {
            canceled = true;
            numTimedOut += 1;
            numActiveProcesses -= 1;
            eventEmitter.emit('processFinished');
            updateStatus();
            resolve(false);
          }
        }
      }, 50000);
    }

    function tryToStartChild() {
      if (numActiveProcesses < 12) {
        startChild();
        numActiveProcesses += 1;
        eventEmitter.removeListener('processFinished', tryToStartChild);
      }
    }

    if (url === null) {
      resolve(true);
    } else {
      eventEmitter.on('processFinished', tryToStartChild);
      tryToStartChild();
    }
  });
});

RSVP.all(promises).then(function (linesToKeep) {
  console.log('\n');
  linesToKeep.forEach(function (keepIt, lineNumber) {
    if (keepIt) {
      console.log(lines[lineNumber]);
    }
  });
  process.exit();
});


// var eventEmitter = new events.EventEmitter();
// var ringBell = function ringBell()
// {
//   console.log('ring ring ring');
// }
// eventEmitter.on('doorOpen', ringBell);
// eventEmitter.emit('doorOpen');
