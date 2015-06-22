var Levenshtein = require('levenshtein');

module.exports = function (text, match, maxDistance) {
  return text.match(/\w+/g).some(function (word) {
    return new Levenshtein(word, match).distance < maxDistance;
  });
};
