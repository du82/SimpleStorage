import apiMixin from './api';
import initMixin from './init';
import miscMixin from './misc';
import pluginMixin from './plugin';
import eventsMixin from './events';
import handlersMixin from './handlers';

function Filepicker(options) {
    this._init(options);
}

Filepicker.plugins = {};
Filepicker.namespace = 'filepicker';
Filepicker.pluginName = 'filePicker';

/**
 * Register a plugin.
 *
 * @param {String} name
 * @param {Function} callback
 */
Filepicker.plugin = function (name, callback) {
    Filepicker.plugins[name] = callback;
}

initMixin(Filepicker);
handlersMixin(Filepicker);
eventsMixin(Filepicker);
miscMixin(Filepicker);
apiMixin(Filepicker);
pluginMixin(Filepicker);

export default Filepicker;
