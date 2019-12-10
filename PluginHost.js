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

	async init() {
		await this._runCommandOnAllPlugins('init')
	}

	async shutdown() {
		await this._runCommandOnAllPlugins('shutdown')
	}

	async _runCommandOnAllPlugins(cmd) {
		this._verifyOpState(cmd)
		this._opStateOngoing(cmd)

		let plugins = Array.from(this._plugins)

		for (let plugin of plugins) {
			await this._runPluginCommand(plugin, cmd)
		}

		this._opStateComplete(cmd)
		debug(`${cmd} done`)
	}

	async _runPluginCommand(plugin, cmd) {
		debug(`execute plugin ${cmd}`)
		try {
			await plugin[cmd](this._hostApi)
		} catch (e) {
			this._opStateFailed(cmd, e)
			debug(`plugin ${plugin.name} ${cmd} error`, e)
			const wrapped = new Error(`failed to run "${cmd}" on plugin "${plugin.name}", due to "${e}" error, you can access a reference to the original thrown error using the "sourceError" property on this error instance`)
			wrapped.sourceError = e
			throw wrapped
		}
	}

	_verifyOpState(op) {
		const opState = this[`_${op}`]

		if (opState.done) {
			throw new Error(`${op}() already executed`)
		}

		if (opState.ongoing) {
			throw new Error(`${op}() in progress`)
		}
	}

	_opStateComplete(op) {
		const opState = this[`_${op}`]
		opState.done = true
		opState.ongoing = false
	}

	_opStateFailed(op) {
		const opState = this[`_${op}`]
		opState.ongoing = false
		opState
	}

	_opStateOngoing(op) {
		const opState = this[`_${op}`]
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
	const result = []
	for (let packageName in deps) {
		if (packageName.startsWith(prefix)) {
			result.push(packageName)
		}
	}

	return result
}

function loadPlugins(requireFunctor, version, packages) {
	const plugins = []
	for (let packageName of packages) {
		const packageModule = requireFunctor(packageName)

		if (!(packageModule.pluggage)) {
			debug(`package ${packageName} does not exports a pluggage plugin`)
			continue
		}

		if (!(packageModule.pluggage instanceof Plugin)) {
			debug(`package ${packageName} exports an invalid pluggage plugin`)
			continue
		}

		const plugin = packageModule.pluggage
		plugin.name = packageName

		if (semver.diff(plugin.version, version) === 'major') {
			throw new TypeError(`package ${packageName} is incompatible with this plugin host`)
		}

		plugins.push(plugin)
	}

	return plugins
}