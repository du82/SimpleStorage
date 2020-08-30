import $ from 'jquery';

export default function (Filepicker) {
    /**
     * Add data methods.
     *
     * @param  {Object} data
     * @return {Object}
     *         .state
     *         .progress
     *         .promise()
     *         .send()
     *         .abort()
     */
    Filepicker.prototype._addMethods = function (data) {
        const dfd = $.Deferred();

        data.state = 'pending';
        data.progress = {total: 0, loaded: 0};
        data.promise = () => dfd.promise();

        /**
         * Send data.
         *
         * @param  {Object} options
         * @return {Object|Boolean} jQuery Promise Object
         */
        data.send = (options) => {
            if (data.state === 'sending') {
                return dfd;
            }

            data.state = 'sending';

            const xhr = data.xhr = $.ajaxSettings.xhr();
            const route = this._route('upload', 'POST');

            xhr.open(route.method, route.uri, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    data.progress.total = e.total;
                    data.progress.loaded = e.loaded;

                    dfd.notify(e.loaded, e.total, xhr);
                }
            }

            xhr.onload = () => {
                xhr.responseJSON = null;

                try {
                    xhr.responseJSON = $.parseJSON(xhr.responseText);
                } catch (e) {
                    const max = this._getPostMaxSize(xhr.responseText);

                    if (max > -1) {
                        dfd.reject(this.trans('postMaxSize', {max: max}), xhr);
                    } else {
                        dfd.reject(this.trans('error'), xhr);
                    }
                }

                if (xhr.responseJSON != null) {
                    if (xhr.status === 200 || xhr.status === 201) {
                        dfd.resolve(xhr.responseJSON, xhr);
                    } else {
                        dfd.reject(this.trans('error', {response: xhr.responseJSON}), xhr);
                    }
                }
            }

            const formData = new FormData();

            $.each(this.data(options), (key, value) => {
                formData.append(key, value);
            });

            $.each(data.files, (_, file) => {
                if (!file.error) {
                    formData.append(this.options.paramName, file, file.name);
                }
            });

            xhr.send(formData);

            return data.promise();
        }

        /**
         * Abort upload.
         */
        data.abort = () => {
            if (data.xhr) {
                data.xhr.abort();
            }

            this._processQueue();
        }

        return data;
    }

    /**
     * Process data queue files.
     */
    Filepicker.prototype._processQueue = function () {
        this._sending--;

        const parallel = this.options.parallelUploads;

        if (!parallel || parallel > this._sending) {
            for (let i = 0; i < this._queue.length; i++) {
                if (this._queue[i].state != 'sending') {
                    this._queue[i].send();
                    this._queue.splice(i, 1);
                    this._sending++;
                    break;
                }
            }
        }
    }

    /**
     * Make a jQuery ajax request.
     *
     * @param  {Object} route {uri:, method:}
     * @param  {Object} data
     * @return {Object} jQuery Promise Object
     */
    Filepicker.prototype._ajax = function (route, data) {
        if (route.method != 'GET' && route.method != 'POST') {
            data._method = route.method;
            route.method = 'POST';
        }

        return $.ajax({
            url: route.uri,
            type: route.method,
            dataType: 'json',
            data: this.data(data)
        });
    }

    /**
     * Get route by name.
     *
     * @param  {String} name
     * @param  {String} method
     * @return {Object} {uri:, method:}
     */
    Filepicker.prototype._route = function (name, method) {
        const route = this.options.routes[name];

        return {
            uri: route ? route.uri : this.options.url,
            method: route ? route.method : (method || 'GET')
        };
    }

    /**
     * Get file extension.
     *
     * @param  {Strng} filename
     * @return {String}
     */
    Filepicker.prototype._getExtension = function (filename) {
        return filename.substr(filename.lastIndexOf('.') + 1, filename.length);
    }

    /**
     * Format file time.
     * https://gist.github.com/kmaida/6045266
     *
     * @param  {Number} timestamp
     * @return {String}
     */
    Filepicker.prototype._formatTime = function (timestamp) {
        let d = new Date(timestamp * 1000),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM';

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh == 0) {
            h = 12;
        }

        return `${yyyy}-${mm}-${dd}, ${h}:${min} ${ampm}`;
    }

    /**
     * Format size.
     *
     * @param  {Number} bytes
     * @return {String}
     */
    Filepicker.prototype._formatSize = function (bytes) {
        if (!$.isNumeric(bytes)) {
            return '';
        }

        const quant = {
            GB: 1073741824,
            MB: 1048576,
            KB: 1024,
            B: 1
        };

        for (let unit in quant) {
            if (bytes >= quant[unit]) {
                let size = Math.round(bytes / quant[unit] * 10) / 10;
                return `${size} ${unit}`;
            }
        }
    }

    /**
     * Get the files from the input.
     *
     * @param  {Object} input
     * @return {Array}
     */
    Filepicker.prototype._getInputFiles = function (input) {
        const files = $.makeArray(input.prop('files'));

        this._replaceInput(input);

        return files;
    }

    /**
     * Replace the input.
     *
     * @param {Object} input
     */
    Filepicker.prototype._replaceInput = function (input) {
        const inputClone = input.clone(true);

        $('<form/>').append(inputClone)[0].reset();

        input.after(inputClone).detach();

        $.cleanData(input.off('remove'));

        let inputs = [];

        if (this.options.fileInput instanceof $) {
            inputs = this.options.fileInput;
        } else if (this.element) {
            inputs = this.element.find(this.options.fileInput);
        }

        inputs.map((i, el) => {
            if (el === input[0]) {
                return inputClone[0];
            }

            return el;
        });
    }

    /**
     * Get "POST Content-Length" error size.
     *
     * @param  {String} response
     * @return {Number}
     */
    Filepicker.prototype._getPostMaxSize = function (text) {
        if (text.indexOf('POST Content-Length') === -1) {
            return -1;
        }

        const matches = text.match(/\d+/g) || [];

        return matches[1] ? Math.round(matches[1] / 1048576) : 0;
    }
}
