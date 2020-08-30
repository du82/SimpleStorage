import $ from 'jquery';
import defaults from './defaults';

export default function (Filepicker) {
    /**
     * Initialize.
     *
     * @param  {Object} options
     */
    Filepicker.prototype._init = function (options) {
        this.events = {};
        this.plugins = {};
        this.element = options.el || null;
        this.options = $.extend(true, $.extend(true, {}, defaults), options);

        this._queue = [];
        this._sending = 0;

        this._registerPlugins();

        $.extend(true, this.options, options);

        if (this.options.fileInput instanceof $) {
            this.on(this.options.fileInput, 'change', this.onChange);
        } else {
            this.on(this.element, 'change', this.options.fileInput, this.onChange);
        }

        this.trigger('init');

        this._initPlugins();
    }

    /**
     * Register plugins.
     */
    Filepicker.prototype._registerPlugins = function () {
        $.each(this.options.plugins, (_, name) => {
            if (Filepicker.plugins[name]) {
                this.plugins[name] = new Filepicker.plugins[name](this);
            }
        });
    }

    /**
     * Initialize plugins.
     */
    Filepicker.prototype._initPlugins = function () {
        $.each(this.options.plugins, (_, name) => {
            if (this.plugins[name]) {
                this._initPlugin(this.plugins[name]);
            }
        });
    }

    /**
     * Initialize and extend plugin.
     *
     * @param {Object} plugin
     */
    Filepicker.prototype._initPlugin = function (plugin) {
        const _this = this;

        /**
         * Remove an event handler from element and instance.
         *
         * See Filepicker.prototype.trigger (events.js).
         */
        plugin.trigger = function (type, event, data = {}, context) {
            return _this.trigger(type, event, data, context);
        }

        /**
         * Add event listener on element or instance.
         *
         * See Filepicker.prototype.on (events.js).
         */
        plugin.on = function () {
            const args = arguments;

            if ($.isFunction(args[2])) {
                args[4] = args[3] || this;
                args[3] = args[2];
                args[2] = null;
            } else {
                args[4] = args[4] || this;
            }

            return _this.on(args[0], args[1], args[2], args[3], args[4]);
        }

        plugin.init();
    }
}
