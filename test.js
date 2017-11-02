const { expect } = require('chai')
const pluggage = require('./index')
const version = require('./package.json').version
const Plugin = require('./Plugin')

describe('pluggage', () => {

	describe('plugin', () => {
		it('throws an error if plugin implementation is missing', () => {
			expect(() => {
				pluggage.plugin()
			}).to.throw('missing plugin implementation')
		})

		it('throws an error if init function is missing', () => {
			expect(() => {
				pluggage.plugin({})
			}).to.throw('missing init() method in plugin implementation')
		})

		it('throws an error if shutdown function is missing', () => {
			expect(() => {
				pluggage.plugin({ init: () => {}})
			}).to.throw('missing shutdown() method in plugin implementation')
		})

		it('is created with version info', () => {
			let plugin = pluggage.plugin({ init: () => {}, shutdown: () => {}})
			expect(plugin.version).to.equal(version)
		})
	})

	describe('plugin host', () => {
		let requireSystem, requireFunctor, opts, hostApi

		it('creates a plugin host', () => {
			expect(() => {
				pluggage.host(opts)
			}).to.not.throw()
		})

		it('throws an error if neither "prefix" nor "exact" properties are provided', () => {
			expect(() => {
				pluggage.host({})
			}).to.throw('specifying a package prefix or exact package names is required')
		})

		it('throws an error if plugin version is not compatible with host version (major)', () => {
			expect(() => {
				opts.pluggageVersion = '2.3.3'
				pluggage.host(opts)
			}).to.throw('package foo is incompatible with this plugin host')
		})

		it('does not include packages that dont export a pluggage property', () => {
			opts.exact = ['foo3']
			expect(Array.from(pluggage.host(opts))).to.have.length(0)
		})

		it('loads plugins based on exact package names', () => {
			let host = pluggage.host(opts)
			let plugins = Array.from(host)

			expect(plugins).to.have.length(2)
			expect(plugins[0]).to.be.instanceOf(MockPlugin)
			expect(plugins[1]).to.be.instanceOf(MockPlugin)
		})

		it('loads plugins based on a prefix of package names', () => {
			opts.prefix = 'foo'
			delete opts.exact

			let host = pluggage.host(opts)
			let plugins = Array.from(host)

			expect(plugins).to.have.length(2)
			expect(plugins[0]).to.be.instanceOf(MockPlugin)
			expect(plugins[1]).to.be.instanceOf(MockPlugin)
		})

		it('initializes the plugins', (done) => {
			let host = pluggage.host(opts)
			host.init((err) => {
				for (let plugin of host) {
					expect(plugin.initWasCalled).to.be.true
				}
				done()
			})
		})

		it('exposes the host api to the plugin during initialization', (done) => {
			let host = pluggage.host(opts)
			host.init((err) => {
				for (let plugin of host) {
					expect(plugin.initParams[0]).to.equal(hostApi)
					plugin.initParams[0].foo()
				}
				expect(hostApi.fooCall).to.equal(2)
				done()
			})
		})

		it('cannot be initialized twice', (done) => {
			let host = pluggage.host(opts)
			host.init((err) => {
				expect(() => {
					host.init((err) => {})
				}).to.throw('init() already executed')
				done()
			})
		})

		it('cannot be initialized twice concurrently', (done) => {
			let host = pluggage.host(opts)
			host.init((err) => {
				done()
			})

			expect(() => {
				host.init((err) => {})
			}).to.throw('init() already in progress')
		})

		it('shutdown the plugins', (done) => {
			let host = pluggage.host(opts)
			host.shutdown((err) => {
				for (let plugin of host) {
					expect(plugin.shutdownWasCalled).to.be.true
				}
				done()
			})
		})

		it('cannot be shutdown twice', (done) => {
			let host = pluggage.host(opts)
			host.shutdown((err) => {
				expect(() => {
					host.shutdown((err) => {})
				}).to.throw('shutdown() already executed')
				done()
			})
		})

		it('cannot be shutdown twice concurrently', (done) => {
			let host = pluggage.host(opts)
			host.shutdown((err) => {
				done()
			})

			expect(() => {
				host.shutdown((err) => {})
			}).to.throw('shutdown() already in progress')
		})

		beforeEach(() => {
			requireSystem = new MockRequireSystem()
			requireSystem.packages.foo = { pluggage: new MockPlugin() }
			requireSystem.packages.foo2 = { pluggage: new MockPlugin() }
			requireSystem.packages.foo3 = {}
			requireSystem.packages.bar = { pluggage: new MockPlugin() }

			requireFunctor = (packageName) => {
				return requireSystem.require(packageName)
			}

			hostApi = new MockHostApi()

			opts = {
				hostApi,
				exact: ['foo', 'foo2'],
				version,
				packageJsonDepsOverride: requireSystem.packages,
				requireFunctor: (packageName) => {
					return requireSystem.require(packageName)
				}
			}
		})
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
				init: (hostApi, callback) => {
					this.initWasCalled = true
					this.initParams = [hostApi]
					setImmediate(callback)
				},
				shutdown: (callback) => {
					this.shutdownWasCalled = true
					setImmediate(callback)
				}
			})
		}
	}
})
