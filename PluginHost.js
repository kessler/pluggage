const pkgDir = require('pkg-dir')
const path = require('path')
const Plugin = require('./Plugin')
const semver = require('semver')
const version = require('./package.json').version
const debug = require('debug')('pluggage:PluginHost')

class PluginHost {
	constructor({ hostApi = {}, plugins }) {
		this._hostApi = hostApi
		this._plugins = plugins

		this._init = {
			done: false,
			ongoing: false
		}

		this._shutdown = {
			done: false,
			ongoing: false
		}
	}

	init(callback) {
		this._verifyOpState('init')
		this._opStateOngoing('init')

		let plugins = Array.from(this._plugins)

		let executeOne = () => {
			if (plugins.length === 0) {
				this._opStateComplete('init')
				debug(`init done`)
				return callback()
			}

			let plugin = plugins.pop()
			debug(`execute plugin init`)

			plugin.init(this._hostApi, (err) => {
				if (err) {
					this._opStateFailed('init')
					debug(`plugin init error`, err)
					return callback(err)
				}

				executeOne()
			})
		}

		executeOne()
	}

	shutdown(callback) {
		this._verifyOpState('shutdown')
		this._opStateOngoing('shutdown')

		let plugins = Array.from(this._plugins)

		let executeOne = () => {
			if (plugins.length === 0) {
				this._opStateComplete('shutdown')
				debug(`shutdown done`)
				return callback()
			}

			let plugin = plugins.pop()
			debug(`execute plugin shutdown`)

			plugin.shutdown((err) => {
				if (err) {
					this._opStateFailed('shutdown')
					debug(`plugin shutdown error`, err)
					return callback(err)
				}

				executeOne()
			})
		}

		executeOne()
	}

	_verifyOpState(op) {
		let opState = this[`_${op}`]

		if (opState.done) {
			throw new Error(`${op}() already executed`)
		}

		if (opState.ongoing) {
			throw new Error(`${op}() already in progress`)
		}
	}

	_opStateComplete(op) {
		let opState = this[`_${op}`]

		opState.done = true
		opState.ongoing = false
	}

	_opStateFailed(op) {
		let opState = this[`_${op}`]
		opState.ongoing = false
	}

	_opStateOngoing(op) {
		let opState = this[`_${op}`]
		opState.ongoing = true
	}

	get isInitialized() {
		return this._init.done
	}

	get isShutdown() {
		return this._shutdown.done
	}

	[Symbol.iterator]() {
		return this._plugins[Symbol.iterator]()
	}

	/**
	 *	instantiate a plugin host
	 *
	 *	@param {object} hostApi - an object that the host wishes to expose
	 *							to the hosted plugins
	 *	@param {string} prefix - a prefix used to load
	 *
	 */
	static create({
		hostApi = {},
		prefix,
		exact = [],
		requireFunctor = require,
		packageJsonDepsOverride,
		pluggageVersion = version
	}) {

		if (prefix === undefined && exact.length === 0) {
			throw new Error('specifying a package prefix or exact package names is required')
		}

		debug('creating a plugin host')

		let deps = packageJsonDepsOverride
		if (!deps) {
			let pkgRoot = pkgDir.sync()
			let packageJsonPath = path.join(pkgRoot, 'package.json')
			let packageJson = require(packageJsonPath)
			deps = packageJson.dependencies
		}

		let selectedPackages
		if (exact.length > 0) {
			selectedPackages = exact
		} else {
			selectedPackages = findByPrefix(prefix, deps)
		}

		let plugins = loadPlugins(requireFunctor, pluggageVersion, selectedPackages)

		return new PluginHost({ hostApi, plugins })
	}
}

module.exports = PluginHost

function findByPrefix(prefix, deps) {
	let result = []
	for (let packageName in deps) {
		if (packageName.startsWith(prefix)) {
			result.push(packageName)
		}
	}

	return result
}

function loadPlugins(requireFunctor, version, packages) {
	let plugins = []
	for (let packageName of packages) {
		let packageModule = requireFunctor(packageName)

		if (!(packageModule.pluggage)) {
			debug(`package ${packageName} does not exports a pluggage plugin`)
			continue
		}

		if (!(packageModule.pluggage instanceof Plugin)) {
			debug(`package ${packageName} exports an invalid pluggage plugin`)
			continue
		}

		let plugin = packageModule.pluggage
		plugin.name = packageName

		if (semver.diff(plugin.version, version) === 'major') {
			throw new TypeError(`package ${packageName} is incompatible with this plugin host`)
		}

		plugins.push(plugin)
	}

	return plugins
}
