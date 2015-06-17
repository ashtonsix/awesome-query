Awesome Query
=============
To Do
-----
* Documentation (readme & annotations)
* Tests
* Implement functionality described by yargs
* Only output ansi charachters
* Anonomously collect usage stats
* If a phantom instance crashes it should be restarted and not affect the program
* Bin commands
* Find a "10 things to do before you publish a module to NPM" thing

Examples
--------

```js
module.exports = function(page) {
  return page.text.match(/\w+/g).some(function(word) {
    return new require('levenshtein')(word, 'reactive').distance < 4;
  })
});
```

License
-------
Copyright (c) 2015, Ashton War <me@ashtonwar.com>

[ISC](./README.md)
