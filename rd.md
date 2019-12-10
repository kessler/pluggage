# pluggage

[![npm status](http://img.shields.io/npm/v/pluggage.svg?style=flat-square)](https://www.npmjs.org/package/pluggage) [![Travis build status](https://img.shields.io/travis/kessler/pluggage.svg?style=flat-square&label=travis)](http://travis-ci.org/kessler/pluggage) [![Dependency status](https://img.shields.io/david/kessler/pluggage.svg?style=flat-square)](https://david-dm.org/kessler/pluggage)

**A very slim framework for building pluggable code.**

If you want to build an application or a framework that uses plugins for extensibility, you should take a look at pluggage. Pluggage takes care of discovery and lifecycle management of the plugins. Beyond that, pluggage imposes very little on the interaction between plugin and host.

_`Pluggage` is a combination of `plugin` and `package`, but it also sounds a lot like `luggage`_

## install

With [npm](https://npmjs.org) do:

```
npm install --save pluggage
```

## host/load plugins in your code

A plugin host manages discovery and lifecycle of plugins. It can also expose an api to them. To install a plugin simply `npm install your-plugin` in the host application.  This can be an npm package or local code installed as a package ([more on that here](LOCAL-CODE-PACKAGE.md))

Using `exact` or `prefix` in the `host(...)` options will make pluggage automatically load and initialize packages that were `npm` installed.

```js
const pluggage = require('pluggage')

async function main() {
    const hostApi = {
        foo: () => {}
    }

    // load all plugins who's package name starts with `generator-``
    const host = pluggage.host({ prefix: 'generator-', hostApi })

    // initialize the plugins
    await host.init()
    await host.shutdown()

    // load the plugins who's package name exactly match the names specified in the array
    const exactHost = pluggage.host({ exact: ['plugin1', 'plugin2'], hostApi })
}

main()

```

## Write a plugin

A plugin is just a package that exports the `pluggage` interface (using the `pluggage` property). 

```js
const pluggage = require('pluggage')

module.exports.pluggage = pluggage.plugin({
   init:  async (hostApi) => {},
   shutdown: async () => {}
})
```

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
