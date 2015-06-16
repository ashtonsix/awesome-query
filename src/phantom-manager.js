var PhantomContainer = require('./phantom-container.js');

var charm = require('charm')();
charm.pipe(process.stdout);

module.exports = function PhantomManager(urls, options) {
  var children = [];
  var callback;

  var urlQueue = urls.slice();
  var pages = [];

  var pagesCurrentlyProcessing = [];
  var pagesSucessfullyCompleted = [];
  var pagesTimedOut = [];

  function finish() {
    if (callback) {
      callback(pages);
    }
  }

  function printStatus() {
    if (options.logOutput[1] !== 'verbose') {
      charm.up(1);
    }

    console.log(
      '(' + pagesCurrentlyProcessing + '/' + urls.length + ') processing. (' + pagesSucessfullyCompleted + '/' +
      urls.length + ') completed. (' + pagesTimedOut + '/' + urls.length + ') timed out.'
    );
  }

  function Url() {
    function init() {
      if (urlQueue.length <= 0) {
        if (pagesCurrentlyProcessing.length <= 0) {
          finish();
        }

        throw {message: 'No URL\'s left to process'};
      }

      pages[urlQueue.length - 1] = this;

      this.attempts = options.attempts;
      this.address = urlQueue.pop();

      pagesCurrentlyProcessing.push(this);

      printUpdate('start');
    }

    function removeSelfFromCurrentlyProcessingList() {
      pagesCurrentlyProcessing = pagesCurrentlyProcessing.filter(function (page) {
        return page.address !== this.address;
      });
    }

    function printUpdate(type) {
      if (options.logOutput[1] === 'verbose') {
        Url.printUpdateCalls += 1;
        charm.display('dim');
        process.stdout.write(this.address + ' ');
        charm.display('reset');

        if (type === 'start') {
          console.log('started');
        } else if (type === 'retry') {
          console.log('timed out, retrying (' + this.attempts + ' attempts left)');
        } else {
          console.log(type);
        }
      }

      if (Url.printUpdateCalls % 20 === 0) {
        printStatus();
      }
    }

    init();

    this.retry = function () {
      this.attempts -= 1;
      printUpdate('retry');
    };

    this.fail = function () {
      this.resolution = 'failure';
      removeSelfFromCurrentlyProcessingList();
      pagesTimedOut.push(this);
      printUpdate('timed out');
    };

    this.success = function (data) {
      this.text = data.text;
      this.data = data.data;
      this.resolution = 'success';
      removeSelfFromCurrentlyProcessingList();
      pagesSucessfullyCompleted.push(this);
      printUpdate('completed');
    };
  }

  Url.printUpdateCalls = 0;

  if (options.logOutput[1] !== 'verbose') {
    process.stdout.write('\n');
  }

  for (var i = 0; i < options.numProcesses; i += 1) {
    children[i] = new PhantomContainer();
  }

  children.forEach(function (child) {
    var url;

    function next() {
      try {
        url = new Url();
      } finally {
        child.kill();
      }

      if (url.address) {
        child.get(url.address);
      }
    }

    child.on('failure', function () {
      if (url.attempts > 0) {
        url.retry();
        child.get(url.address);
      } else {
        url.fail();
        next();
      }
    });

    child.on('success', function (data) {
      url.success(data);
      next();
    });

    next();
  });

  this.then = function (cb) {
    callback = cb;
  };
};

// var eventEmitter = (new events.EventEmitter()).setMaxListeners(0);
// var lines = require('./conferences.txt').split('\n');

// var numPromises = lines.filter(function (line) {
//   return line.match(reg) !== null;
// }).length;
// var numResolved = 0;
// var numTimedOut = 0;
// var numActiveProcesses = 0;

// var PhantomContainer = (function () {
//   function init() {
//   }

//   init();
// }());

// function PhantomManager() {
//   function init() {
//     this.numActiveProcesses = 0;
//   }
// }

// function updateStatus() {
//   process.stdout.write('\r' + numResolved + ' of ' + numPromises + ' URLs checked, ' + numTimedOut + ' timed out.');
// }

// updateStatus();

// var promises = lines.map(function (line) {
//   return new RSVP.Promise(function (resolve) {
//     var url = line.match(reg);
//     var retries = 1;

//     var canceled = false;
//     var completed = false;

//     function startChild() {
//       var data = '';
//       var child = spawn('phantomjs', [path.join(__dirname, 'phantom.js'), url[0], '--load-images=no']);
//       var timedOut = false;

//       console.log(url[0] + ' started');

//       child.stdout.on('data', function (chunk) {
//         data += chunk;
//       });

//       child.stdout.on('end', function () {
//         if (!canceled && !completed && !timedOut) {
//           child.kill();
//           completed = true;
//           numResolved += 1;
//           numActiveProcesses -= 1;
//           eventEmitter.emit('processFinished');
//           updateStatus();
//           resolve(data.indexOf('2015') !== -1);
//         }
//       });

//       setTimeout(function () {
//         timedOut = true;
//         child.kill();
//         if (!canceled && !completed) {
//           if (retries) {
//             console.log(url[0] + ' failed, retrying (' + retries + ' attempts left)');
//             retries -= 1;
//             startChild();
//           } else {
//             canceled = true;
//             numTimedOut += 1;
//             numActiveProcesses -= 1;
//             eventEmitter.emit('processFinished');
//             updateStatus();
//             resolve(false);
//           }
//         }
//       }, 50000);
//     }

//     function tryToStartChild() {
//       if (numActiveProcesses < 12) {
//         startChild();
//         numActiveProcesses += 1;
//         eventEmitter.removeListener('processFinished', tryToStartChild);
//       }
//     }

//     if (url === null) {
//       resolve(true);
//     } else {
//       eventEmitter.on('processFinished', tryToStartChild);
//       tryToStartChild();
//     }
//   });
// });

// RSVP.all(promises).then(function (linesToKeep) {
//   console.log('\n');
//   linesToKeep.forEach(function (keepIt, lineNumber) {
//     if (keepIt) {
//       console.log(lines[lineNumber]);
//     }
//   });
//   process.exit();
// });


// // var eventEmitter = new events.EventEmitter();
// // var ringBell = function ringBell()
// // {
// //   console.log('ring ring ring');
// // }
// // eventEmitter.on('doorOpen', ringBell);
// // eventEmitter.emit('doorOpen');
