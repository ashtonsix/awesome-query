var page = require('webpage').create();
var args = require('system').args;

page.open(args[1], function (status) {
  if (status !== 'success') {
    console.log('Unable to access network');
  } else {
    window.setTimeout(function () {
      console.log(
        page.evaluate(function () {
          return document.body.innerText;
        })
      );
      phantom.exit(); // eslint-disable-line
    }, 2000);
  }
});
