const semver = require('semver')
const version = require('./package.json').version

class Plugin {
	constructor(userPlugin, pluggageVersion) {
		pluggageVersion = pluggageVersion || version

		this._userPlugin = userPlugin

		if (!userPlugin) {
			throw new TypeError('missing plugin implementation')
		}

		if (typeof(userPlugin.init) !== 'function') {
			throw new TypeError('missing init() method in plugin implementation')
		}

		if (typeof(userPlugin.shutdown) !== 'function') {
			throw new TypeError('missing shutdown() method in plugin implementation')
		}

		if (!isValidSemver(pluggageVersion)) {
			throw new TypeError(`version "${pluggageVersion}" is not a valid semver version`)
		}

		this._pluggageVersion = pluggageVersion
	}

	/**
	 *	create a plugin interface
	 *
	 *	@param {object} plugin - an object with an init() and shutdown() methods
	 *	@param {string} _versionOverride - a semver version, this is used for testing purposes
	 *										mostly.
	 *
	 */
	static create(userPlugin, overrideVersion) {
		return new Plugin(userPlugin, overrideVersion)
	}

	get version () {
		return this._pluggageVersion
	}

	init(hostApi, callback) {
		this._userPlugin.init(hostApi, callback)
	}

	shutdown(callback) {
		this._userPlugin.shutdown(callback)
	}
}

function isValidSemver(version) {
	return semver.valid(version) !== null
}

module.exports = Plugin
