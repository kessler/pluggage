# pluggage

**Packages as plugins**

A low level package designed to ease the creation of pluggable code.

`Pluggage` is a combination of `plugin` and `package`, but it also sounds a lot like `luggage`


[![npm status](http://img.shields.io/npm/v/pluggage.svg?style=flat-square)](https://www.npmjs.org/package/pluggage) [![Travis build status](https://img.shields.io/travis/kessler/pluggage.svg?style=flat-square&label=travis)](http://travis-ci.org/kessler/pluggage) [![Dependency status](https://img.shields.io/david/kessler/pluggage.svg?style=flat-square)](https://david-dm.org/kessler/pluggage)

## install

With [npm](https://npmjs.org) do:

```
npm install --save pluggage
```

## Write a plugin

A plugin is just a package that exports the `pluggage` interface. The interface allows the host to manage the lifecycle of the plugin.

```js
const pluggage = require('pluggage')

module.exports.pluggage = pluggage.plugin({
   init:  (host, callback) => {},
   shutdown: (host, callback) => {}
})
```

## Host/Load plugins in your code

 A plugin host manages the lifecycle of plugins and can expose an api to them.

```js
const pluggage = require('pluggage')

const hostApi = {
    foo: () => {}
}

let host = pluggage.host({ prefix: 'generator-', hostApi })
host.init((err) => {
    // load all plugins who's package name starts with `generator-``
})

pluggage.host({ exact: ['plugin1', 'plugin2'], hostApi }, (err, pluginHost) => {
    // load the plugins who's package name exactly match the names specified in the array
})

// TODO promise based API
```

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
