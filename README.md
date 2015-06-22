Awesome Query
=============
Simple crawler that filters URL's based on their content. Uses concurrent PhantomJS instances to grab content. Built for [awesome-lists](https://github.com/sindresorhus/awesome).

Quick Setup
-----------
```sh
sudo npm i -g awesome-query
```

Then restart your terminal[1].

To get a list of conferences in 2015:

```sh
awesome-query 2015 ~/awesome-lists/conferences.txt -v -o stdout
```

Run `awesome-query` with no arguments for help.

Usage
-----
You can also use awesome-query inside node.

Pass the URL's as an array.

```js
var conferences = [
  'http://beyondtellerrand.com',
  'http://greatbritishnodeconf.co.uk',
  'http://coldfrontconf.com',
  'http://cssconf.eu'
];
```

Pass the options as an object.

```js
var options = {
  'verbose': false,
  'rejectFailures': false,
  'urlsOnly': false,
  'timeout': 20000,
  'attempts': 3,
  'parallelization': 4
};
```

The selector should be either a RegExp object

```js
awesomeQuery(/london/, conferences, options).then(function (data) {
  console.log(data);
});
```

Or a function, it should return either a promise (any object with a then function), or anything else (that evaluates to true or false).

```js
var Levenshtein = require('levenshtein');

var f = function (page) {
  return page.text.match(/\w+/g).some(function (word) {
    return new Levenshtein(word, 'reactive').distance < 4;
  });
};

awesomeQuery(f, conferences, options).then(function (data) {
  console.log(data);
});
```

Sample page object:

```json
{
  "html": "<head><meta name='author' content='Prabdeep'></head> <body><h1>Title</h1></body>",
  "text": "Title",
  "meta": [{"name": "author", "content": "Prabdeep"}],
  "title": ""
}
```

Credit
------
Building this was made significantly easier by [phridge](https://github.com/peerigon/phridge) and [promise-queue](https://github.com/azproduction/promise-queue)

To Do / Contributing
--------------------
Feel free to submit a pull request. These things need doing:

* Anonomously collect usage stats
* Gracefully handle a PhantomJS crash
* Documentation
* Tests

Notes
-----
[1] - NPM doesn't support passing arguments to commands very well. To work-around this awesome-query automatically adds an alias to bashrc.

Reloading bashrc requires restarting your terminal. This may not work on windows-based machines (tested on Ubuntu). You can substitute the `awesome-query` command with `node PATH/TO/AWESOME/QUERY/src/bin/run.js`.

The command will break if you move the relevant files and persist if you remove them.

License
-------
Copyright (c) 2015, Ashton War <me@ashtonwar.com>

[ISC](./LICENSE.md)
