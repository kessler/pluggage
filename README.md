# pluggage

[![npm status](http://img.shields.io/npm/v/pluggage.svg?style=flat-square)](https://www.npmjs.org/package/pluggage)

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

## Creating a plugin

A plugin is just a package that exports the `pluggage` interface (using the `pluggage` property). 

```js
const pluggage = require('pluggage')

module.exports.pluggage = pluggage.plugin({
   init:  async (hostApi) => {},
   shutdown: async () => {}
})
```

#### IMPORTANT: Installing the package in a plugin module
Doing `npm i pluggage` for this scenario is not a good idea. It will cause the host and the plugin to have different instances of what's suppose to be the same class. You're welcome to read more about this kind of problem [here](https://nodejs.org/en/blog/npm/peer-dependencies/#the-problem-plugins).

When developing the pluing module separately (ie not as a local package - [discussed here](LOCAL-CODE-PACKAGE.md)) you should have it as both `dev` and `peer` depedency:
```json
{
    "peerDependencies": {
        "pluggage": "1.x"
    },
    "devDependencies": {
        "pluggage": "x.y.z"
    }
}
```

local packages do not need the _devDepenendencies_.

This is a little awkward, and maybe there's a better solution... please share it if you have one.

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
