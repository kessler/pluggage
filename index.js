const Plugin = require('./Plugin')
const PluginHost = require('./PluginHost')

module.exports.host = PluginHost.create
module.exports.plugin = Plugin.create