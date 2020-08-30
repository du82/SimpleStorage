import $ from 'jquery';

export default function (Filepicker) {
    /**
     * Fetch files from the server.
     *
     * @param  {Object} options
     * @return {Object} jQuery Promise Object
     */
    Filepicker.prototype.fetch = function (options) {
        return this._ajax(this._route('fetch'), options);
    }

    /**
     * Update file by name.
     *
     * @param  {String} file
     * @param  {Object} options
     * @return {Object} jQuery Promise Object
     */
    Filepicker.prototype.update = function (file, options) {
        const route = this._route('patch', 'PATCH');

        return this._ajax(route, $.extend({}, {file: file}, options || {}));
    }

    /**
     * Delete files by name.
     *
     * @param  {String|Array} files
     * @return {Object} jQuery Promise Object
     */
    Filepicker.prototype['delete'] = function (files) {
        files = $.isArray(files) ? files : [files];

        return this._ajax(this._route('delete', 'DELETE'), {files: files});
    }

    /**
     * Get the translation for a given key.
     *
     * @param  {String} id
     * @param  {Object} params
     * @return {String}
     */
    Filepicker.prototype.trans = function (id, params = {}) {
        let message = this.options.messages[id] || id.toString();

        if ($.isFunction(message)) {
            message = message.apply(this, [params]);
        } else {
            for (let key in params) {
                message = message.replace(':' + key, params[key]);
            }
        }

        return message;
    }

    /**
     * Add extra props to the file.
     *
     * @param {Object} file
     */
    Filepicker.prototype.addProps = function (file) {
        if (!file.extension) {
            file.extension = this._getExtension(file.name);
        }

        file.sizeFormatted = this._formatSize(file.size);
        file.imageFile = this.options.imageFileTypes.test(file.name);
        file.timeFormatted = file.time ? this._formatTime(file.time) : '';

        file.timeISOString = () => {
            return Date.prototype.toISOString
                ? new Date(file.time * 1000).toISOString()
                : '';
        }
    }

    /**
     * Get custom data.
     *
     * @param  {Object} merge
     * @return {Object}
     */
    Filepicker.prototype.data = function (merge = {}) {
        let data = this.options.data;

        if ($.isFunction(data)) {
            data = data.apply(this);
        }

        return $.extend({}, data, merge);
    }

    /**
     * Destroy events.
     */
    Filepicker.prototype.destroy = function () {
        this.events = [];

        if (this.element) {
            this.element.off('.' + Filepicker.pluginName);
        }

        if (this.options.fileInput) {
            this.options.fileInput.off('change');
        }

        if (this.options.dropZone) {
            this.options.dropZone.off('dragover dragenter dragleave drop');
        }
    }

    /**
     * Extend plugin.
     *
     * @param {Object} plugin
     * @param {Object} options
     */
    Filepicker.prototype.extend = function (plugin, options) {
        plugin.$f = this;

        $.extend(true, this.options, options);
    }
}
