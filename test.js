const pluggage = require('./index')
const test = require('ava')
const version = require('./package.json').version
const Plugin = require('./Plugin')

test('plugin factory method throws an error if plugin implementation is missing', t => {
	t.throws(() => {
		pluggage.plugin()
	}, 'missing plugin implementation')
})

test('plugin factory method throws an error if init function is missing', t => {
	t.throws(() => {
		pluggage.plugin({})
	}, 'missing init() method in plugin implementation')
})

test('plugin factory method throws an error if shutdown function is missing', t => {
	t.throws(() => {
		pluggage.plugin({ init: () => {} })
	}, 'missing shutdown() method in plugin implementation')
})

test('a plugin is created with version info', t => {
	const plugin = pluggage.plugin({ init: () => {}, shutdown: () => {} })
	t.is(plugin.version, version)
})

test('factory method creates a plugin host', t => {
	t.notThrows(() => {
		pluggage.host(t.context.opts)
	})
})

test('plugin host factory method throws an error if neither "prefix" nor "exact" properties are provided', t => {
	t.throws(() => {
		pluggage.host({})
	}, 'specifying a package prefix or exact package names is required')
})

test('plugin host factory method throws an error if plugin version is not compatible with host version (major)', t => {
	t.throws(() => {
		const { opts } = t.context
		opts.pluggageVersion = '2.3.3'
		pluggage.host(opts)
	}, 'package foo is incompatible with this plugin host')
})

test('a plugin host does not include packages that dont export a pluggage property', t => {
	const { opts } = t.context
	opts.exact = ['foo3']
	const host = pluggage.host(opts)
	const plugins = Array.from(host)

	t.is(Array.from(plugins).length, 0)
})

test('a plugin host loads plugins based on exact package names', t => {
	const host = pluggage.host(t.context.opts)
	const plugins = Array.from(host)

	t.is(plugins.length, 2)
	t.true(plugins[0] instanceof MockPlugin)
	t.true(plugins[1] instanceof MockPlugin)
})

test('a plugin host loads plugins based on a prefix of package names', t => {
	const { opts } = t.context
	opts.prefix = 'foo'
	delete opts.exact

	const host = pluggage.host(opts)
	const plugins = Array.from(host)

	t.is(plugins.length, 2)
	t.true(plugins[0] instanceof MockPlugin)
	t.true(plugins[1] instanceof MockPlugin)
})

test('plugin host initializes the plugins', async t => {
	const host = pluggage.host(t.context.opts)

	await host.init()

	for (let plugin of host) {
		t.true(plugin.initWasCalled)
	}
})

test('a plugin host exposes the host api to the plugin during initialization', async t => {
	const { opts, hostApi } = t.context
	const host = pluggage.host(opts)

	await host.init()

	for (let plugin of host) {
		t.is(plugin.initParams[0], hostApi)
		plugin.initParams[0].foo()
	}
	t.is(hostApi.fooCall, 2)
})

test('plugin host cannot be initialized twice', async t => {
	const host = pluggage.host(t.context.opts)

	await host.init()

	await t.throwsAsync(async () => {
		await host.init()
	}, 'init() already executed')
})

test('plugin host cannot be initialized twice concurrently', async t => {
	const host = pluggage.host(t.context.opts)
	const work = [host.init(), host.init()]

	await t.throwsAsync(async () => {
		await Promise.all(work)
	}, 'init() in progress')
})

test('plugin host sends a shutdown signal to plugins', async t => {
	const host = pluggage.host(t.context.opts)
	await host.shutdown()
	for (let plugin of host) {
		t.true(plugin.shutdownWasCalled)
	}
})

test('plugin host cannot perform shutdown twice', async t => {
	const host = pluggage.host(t.context.opts)
	await host.shutdown()
	await t.throwsAsync(async () => {
		await host.shutdown()
	}, 'shutdown() already executed')
})

test('plugin host cannot perform shutdown twice concurrently', async t => {
	const host = pluggage.host(t.context.opts)
	const work = [host.shutdown(), host.shutdown()]

	await t.throwsAsync(async () => {
		await Promise.all(work)
	}, 'shutdown() in progress')
})

class MockHostApi {
	constructor() {
		this.fooCall = 0
	}

	foo() {
		this.fooCall++
	}
}

class MockRequireSystem {
	constructor() {
		this.packages = {}
	}

	require(packageName) {
		let packageModule = this.packages[packageName]
		if (!packageModule) {
			throw new Error(`Cannot find module \'${packageName}\'`)
		}

		return packageModule
	}
}

class MockPlugin extends Plugin {
	constructor() {
		super({
			init: (hostApi) => {
				this.initWasCalled = true
				this.initParams = [hostApi]
				return new Promise((resolve) => setImmediate(resolve))
			},
			shutdown: () => {
				this.shutdownWasCalled = true
				return new Promise((resolve) => setImmediate(resolve))
			}
		})
	}
}

test.beforeEach(t => {
	const requireSystem = t.context.requireSystem = new MockRequireSystem()
	requireSystem.packages.foo = { pluggage: new MockPlugin() }
	requireSystem.packages.foo2 = { pluggage: new MockPlugin() }
	requireSystem.packages.foo3 = {}
	requireSystem.packages.bar = { pluggage: new MockPlugin() }

	const requireFunctor = t.context.requireFunctor = (packageName) => {
		return requireSystem.require(packageName)
	}

	const hostApi = t.context.hostApi = new MockHostApi()

	t.context.opts = {
		hostApi,
		exact: ['foo', 'foo2'],
		version,
		packageJsonDepsOverride: requireSystem.packages,
		requireFunctor: (packageName) => {
			return requireSystem.require(packageName)
		}
	}
})