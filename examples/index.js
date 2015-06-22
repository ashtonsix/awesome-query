var awesomeQuery = require('../src/index.js');
var levenshtein = require('levenshtein');

var list = require('fs').readFileSync('./list-short.txt', 'utf8').split('\n');

var options = {
  verbose: true,
  urlsOnly: true
};

var lev = function (page) {
  return levenshtein(page.text, 'london', 4);
};

awesomeQuery(lev, list, options).then(function (data) {
  console.log(data);
});
