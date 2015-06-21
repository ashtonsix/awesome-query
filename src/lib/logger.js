function Logger(queue, options) {
  var charm = require('charm')();
  charm.pipe(process.stdout);

  var previousLength = 0;

  queue.completedLength = 0;

  if (!options.verbose) {
    process.stdout.write('(0/' + options.totalUrls + ' done)\n');
  }

  function log(url, action, err) {
    if (action === 'completed' || action === 'failed') {
      queue.completedLength += 1;
    }

    if (options.verbose) {
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

    if (options.verbose || process.stdout.isTTY || (
      (queue.completedLength % 5 === 0 || queue.completedLength === options.totalUrls) &&
      queue.completedLength > previousLength
    )) {
      previousLength = queue.completedLength;
      process.stdout.write('(' + queue.completedLength + '/' + options.totalUrls + ' done)\n');
    }
  }

  return log;
}

module.exports = Logger;
