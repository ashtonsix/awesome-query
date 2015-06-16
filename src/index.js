var PhantomManager = require('./phantom-manager.js');
var fs = require('fs');

var lines = fs.readFileSync('./conferences.txt', 'utf8').split('\n');

var urls = lines.map(function (line) {
  return getUrl(line);
}).filter(function (url) {
  return url;
});

var options = {
  numProcesses: 8,
  attempts: 2,
  timout: 50000,
  logOutput: [true, 'verbose']
};

var phantomManager = new PhantomManager(urls, options);

phantomManager.then(function (pages) {
  var pagesToKeep = pages.map(function (page) {
    return isPageOk(page.err, page.text);
  });

  var output = lines.filter(function (line) {
    return getUrl(line);
  }).filter(function (line, i) {
    return pagesToKeep[i];
  }).join('\n');

  saveOutput('./output.txt', output);
});

function isPageOk(err, data) {
  if (err) {
    return false;
  }

  return data.indexOf('2015') !== -1;
}

function getUrl(str) {
  var url = str.match(/(https?:\/\/)[\w-+:_.~@%#?,&=\/\\]+/);
  return url ? url[0] : null;
}

function saveOutput(location, output) {
  fs.writeFile(location, output, function (err) {
    if (err) {
      return console.log(err);
    }

    console.log('Complete. Output saved to ' + location);
    process.exit();
  });
}
