Awesome Query
=============
To Do
-----
* Documentation (readme & annotations)
* Tests
* Anonomously collect usage stats
* selector-as-module
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
