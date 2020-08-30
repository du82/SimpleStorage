/**
 * This file is part of Filepicker.
 * 
 * Copyright (c) 2016 Cretu Eusebiu <hazzardweb@gmail.com>
 *
 * For the full copyright and license information, please visit:
 * http://codecanyon.net/licenses/standard
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('jquery')) :
    typeof define === 'function' && define.amd ? define(['jquery'], factory) :
    (global.Filepicker = factory(global.jQuery));
}(this, function ($) { 'use strict';

    $ = 'default' in $ ? $['default'] : $;

    function apiMixin (Filepicker) {
        /**
         * Fetch files from the server.
         *
         * @param  {Object} options
         * @return {Object} jQuery Promise Object
         */
        Filepicker.prototype.fetch = function (options) {
            return this._ajax(this._route('fetch'), options);
        };

        /**
         * Update file by name.
         *
         * @param  {String} file
         * @param  {Object} options
         * @return {Object} jQuery Promise Object
         */
        Filepicker.prototype.update = function (file, options) {
            var route = this._route('patch', 'PATCH');

            return this._ajax(route, $.extend({}, { file: file }, options || {}));
        };

        /**
         * Delete files by name.
         *
         * @param  {String|Array} files
         * @return {Object} jQuery Promise Object
         */
        Filepicker.prototype['delete'] = function (files) {
            files = $.isArray(files) ? files : [files];

            return this._ajax(this._route('delete', 'DELETE'), { files: files });
        };

        /**
         * Get the translation for a given key.
         *
         * @param  {String} id
         * @param  {Object} params
         * @return {String}
         */
        Filepicker.prototype.trans = function (id) {
            var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            var message = this.options.messages[id] || id.toString();

            if ($.isFunction(message)) {
                message = message.apply(this, [params]);
            } else {
                for (var key in params) {
                    message = message.replace(':' + key, params[key]);
                }
            }

            return message;
        };

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

            file.timeISOString = function () {
                return Date.prototype.toISOString ? new Date(file.time * 1000).toISOString() : '';
            };
        };

        /**
         * Get custom data.
         *
         * @param  {Object} merge
         * @return {Object}
         */
        Filepicker.prototype.data = function () {
            var merge = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

            var data = this.options.data;

            if ($.isFunction(data)) {
                data = data.apply(this);
            }

            return $.extend({}, data, merge);
        };

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
        };

        /**
         * Extend plugin.
         *
         * @param {Object} plugin
         * @param {Object} options
         */
        Filepicker.prototype.extend = function (plugin, options) {
            plugin.$f = this;

            $.extend(true, this.options, options);
        };
    }

    var defaults = {
        // url: null,
        routes: {
            // upload: {uri : '/upload', method: 'POST'},
        },
        plugins: [],

        uploadMultiple: false,
        uploadMultipleLimit: undefined,
        uploadMultipleSize: undefined,
        uploadMultipleSizeOverhead: 512,
        parallelUploads: undefined,

        // acceptFileTypes: '',
        imageFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
        minFileSize: 1,
        // maxFileSize: undefined,

        data: {},
        paramName: 'files[]',

        fileInput: 'input[type="file"]',

        messages: {
            uploadFallback: 'The browser does not support file uploads.',
            minFileSize: 'The file must be at least :min KB.',
            maxFileSize: 'The file may not be greater than :max KB.',
            postMaxSize: 'The file exceeds the post max size limit of :max MB.',
            invalidFileType: 'The file type is not allowed.',
            error: 'Oops! Something went wrong.',
            abort: 'The operation was aborted.'
        },

        /**
         * Add handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        add: function add(e, data) {
            if (!e.isDefaultPrevented()) {
                this.onSend(e, data);
            }
        },

        /**
         * Progress handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        // progress: function (e, data) {},

        /**
         * Upload done handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        // done: function (e, data) {},

        /**
         * Upload fail handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        // fail: function (e, data) {},

        /**
         * Upload always handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        // always: function (e, data) {},

        /**
         * Validate file handler.
         *
         * @param  {Object} e
         * @param  {Object} file
         * @return {Boolean}
         */
        validate: function validate(e, file) {
            var o = this.options;

            if (o.acceptFileTypes && !o.acceptFileTypes.test(file.name)) {
                file.error = this.trans('invalidFileType');
            } else if (file.size !== undefined && o.maxFileSize && file.size > o.maxFileSize) {
                file.error = this.trans('maxFileSize', { max: o.maxFileSize / 1000 });
            } else if (file.size !== undefined && o.minFileSize && file.size < o.minFileSize) {
                file.error = this.trans('minFileSize', { min: o.minFileSize / 1000 });
            }

            return file.error === undefined;
        },

        /**
         * Upload fallback handler.
         *
         * @param {Object} e
         * @param {String} message
         */
        uploadfallback: function uploadfallback(e, message) {
            alert(message);
        }
    };

    function initMixin (Filepicker) {
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
        };

        /**
         * Register plugins.
         */
        Filepicker.prototype._registerPlugins = function () {
            var _this2 = this;

            $.each(this.options.plugins, function (_, name) {
                if (Filepicker.plugins[name]) {
                    _this2.plugins[name] = new Filepicker.plugins[name](_this2);
                }
            });
        };

        /**
         * Initialize plugins.
         */
        Filepicker.prototype._initPlugins = function () {
            var _this3 = this;

            $.each(this.options.plugins, function (_, name) {
                if (_this3.plugins[name]) {
                    _this3._initPlugin(_this3.plugins[name]);
                }
            });
        };

        /**
         * Initialize and extend plugin.
         *
         * @param {Object} plugin
         */
        Filepicker.prototype._initPlugin = function (plugin) {
            var _this = this;

            /**
             * Remove an event handler from element and instance.
             *
             * See Filepicker.prototype.trigger (events.js).
             */
            plugin.trigger = function (type, event) {
                var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
                var context = arguments[3];

                return _this.trigger(type, event, data, context);
            };

            /**
             * Add event listener on element or instance.
             *
             * See Filepicker.prototype.on (events.js).
             */
            plugin.on = function () {
                var args = arguments;

                if ($.isFunction(args[2])) {
                    args[4] = args[3] || this;
                    args[3] = args[2];
                    args[2] = null;
                } else {
                    args[4] = args[4] || this;
                }

                return _this.on(args[0], args[1], args[2], args[3], args[4]);
            };

            plugin.init();
        };
    }

    function miscMixin (Filepicker) {
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
            var _this = this;

            var dfd = $.Deferred();

            data.state = 'pending';
            data.progress = { total: 0, loaded: 0 };
            data.promise = function () {
                return dfd.promise();
            };

            /**
             * Send data.
             *
             * @param  {Object} options
             * @return {Object|Boolean} jQuery Promise Object
             */
            data.send = function (options) {
                if (data.state === 'sending') {
                    return dfd;
                }

                data.state = 'sending';

                var xhr = data.xhr = $.ajaxSettings.xhr();
                var route = _this._route('upload', 'POST');

                xhr.open(route.method, route.uri, true);

                xhr.upload.onprogress = function (e) {
                    if (e.lengthComputable) {
                        data.progress.total = e.total;
                        data.progress.loaded = e.loaded;

                        dfd.notify(e.loaded, e.total, xhr);
                    }
                };

                xhr.onload = function () {
                    xhr.responseJSON = null;

                    try {
                        xhr.responseJSON = $.parseJSON(xhr.responseText);
                    } catch (e) {
                        var max = _this._getPostMaxSize(xhr.responseText);

                        if (max > -1) {
                            dfd.reject(_this.trans('postMaxSize', { max: max }), xhr);
                        } else {
                            dfd.reject(_this.trans('error'), xhr);
                        }
                    }

                    if (xhr.responseJSON != null) {
                        if (xhr.status === 200 || xhr.status === 201) {
                            dfd.resolve(xhr.responseJSON, xhr);
                        } else {
                            dfd.reject(_this.trans('error', { response: xhr.responseJSON }), xhr);
                        }
                    }
                };

                var formData = new FormData();

                $.each(_this.data(options), function (key, value) {
                    formData.append(key, value);
                });

                $.each(data.files, function (_, file) {
                    if (!file.error) {
                        formData.append(_this.options.paramName, file, file.name);
                    }
                });

                xhr.send(formData);

                return data.promise();
            };

            /**
             * Abort upload.
             */
            data.abort = function () {
                if (data.xhr) {
                    data.xhr.abort();
                }

                _this._processQueue();
            };

            return data;
        };

        /**
         * Process data queue files.
         */
        Filepicker.prototype._processQueue = function () {
            this._sending--;

            var parallel = this.options.parallelUploads;

            if (!parallel || parallel > this._sending) {
                for (var i = 0; i < this._queue.length; i++) {
                    if (this._queue[i].state != 'sending') {
                        this._queue[i].send();
                        this._queue.splice(i, 1);
                        this._sending++;
                        break;
                    }
                }
            }
        };

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
        };

        /**
         * Get route by name.
         *
         * @param  {String} name
         * @param  {String} method
         * @return {Object} {uri:, method:}
         */
        Filepicker.prototype._route = function (name, method) {
            var route = this.options.routes[name];

            return {
                uri: route ? route.uri : this.options.url,
                method: route ? route.method : method || 'GET'
            };
        };

        /**
         * Get file extension.
         *
         * @param  {Strng} filename
         * @return {String}
         */
        Filepicker.prototype._getExtension = function (filename) {
            return filename.substr(filename.lastIndexOf('.') + 1, filename.length);
        };

        /**
         * Format file time.
         * https://gist.github.com/kmaida/6045266
         *
         * @param  {Number} timestamp
         * @return {String}
         */
        Filepicker.prototype._formatTime = function (timestamp) {
            var d = new Date(timestamp * 1000),
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

            return yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
        };

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

            var quant = {
                GB: 1073741824,
                MB: 1048576,
                KB: 1024,
                B: 1
            };

            for (var unit in quant) {
                if (bytes >= quant[unit]) {
                    var size = Math.round(bytes / quant[unit] * 10) / 10;
                    return size + ' ' + unit;
                }
            }
        };

        /**
         * Get the files from the input.
         *
         * @param  {Object} input
         * @return {Array}
         */
        Filepicker.prototype._getInputFiles = function (input) {
            var files = $.makeArray(input.prop('files'));

            this._replaceInput(input);

            return files;
        };

        /**
         * Replace the input.
         *
         * @param {Object} input
         */
        Filepicker.prototype._replaceInput = function (input) {
            var inputClone = input.clone(true);

            $('<form/>').append(inputClone)[0].reset();

            input.after(inputClone).detach();

            $.cleanData(input.off('remove'));

            var inputs = [];

            if (this.options.fileInput instanceof $) {
                inputs = this.options.fileInput;
            } else if (this.element) {
                inputs = this.element.find(this.options.fileInput);
            }

            inputs.map(function (i, el) {
                if (el === input[0]) {
                    return inputClone[0];
                }

                return el;
            });
        };

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

            var matches = text.match(/\d+/g) || [];

            return matches[1] ? Math.round(matches[1] / 1048576) : 0;
        };
    }

    function pluginMixin (Filepicker) {
        /**
         * jQuery plugin definition.
         *
         * @param  {Object} options
         * @return {Object}
         */
        $.fn[Filepicker.pluginName] = function () {
            var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

            var el = $(this);
            var instance = el.data(Filepicker.pluginName);

            if (instance) {
                return instance;
            }

            return this.each(function () {
                options.el = $(this);
                options.el.data(Filepicker.pluginName, new Filepicker(options));
            });
        };
    }

    function eventsMixin (Filepicker) {
        /**
         * Add event listener on element or instance.
         *
         * I. First argument is instance of jQuery.
         *
         * @param {Object} jQuery element.
         * @param {String} Event type.
         * @param {String|Function} Selector or handler.
         * @param {Function|Object} Handler or object.
         * @param {Object}          Context object.
         *
         * II. First argument is string, an event type.
         *
         * @param {String}   jQuery element or event type.
         * @param {Function} Event handler.
         */
        Filepicker.prototype.on = function () {
            if (!arguments[0]) {
                return false;
            }

            if (arguments[0] instanceof $) {
                // Add event handler on the element.

                var element = arguments[0];
                var type = arguments[1];
                var selector = arguments[2];
                var handler = arguments[3];
                var context = arguments[4];

                // Shift arguments if selector is missing.
                if ($.isFunction(selector)) {
                    context = handler;
                    handler = selector;
                    selector = null;
                }

                element.on(type, selector, $.proxy(handler, context || this));
            } else {
                // Add event handler the instance.

                var _type = arguments[0];
                var _handler = arguments[1];

                (this.events[_type] = this.events[_type] || []).push(_handler);
            }
        };

        /**
         * Remove an event handler from element and instance.
         *
         * @param {String}   type
         * @param {Function} handler
         */
        Filepicker.prototype.off = function (type, handler) {
            if (this.element) {
                this.element.off(type, handler);
            }

            type || (this.events = {});

            var list = this.events[type] || [];
            var i = list.length = handler ? list.length : 0;

            while (i--) {
                handler == list[i] && list.splice(i, 1);
            }
        };

        /**
         * Trigger an event on the element and instance.
         *
         * @param  {String} type
         * @param  {Object} event
         * @param  {Object} data
         * @param  {Object} context
         * @return {Boolean}
         */
        Filepicker.prototype.trigger = function (type, event) {
            var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
            var context = arguments[3];

            event = $.Event(event);
            event.type = type + '.' + Filepicker.namespace;

            context = context || this;

            if (this.element) {
                event.target = this.element[0];
            }

            copyProps(event);

            // Trigger event on the element.
            if (this.element) {
                this.element.trigger(event, data);
            }

            // Trigger event on the instance.
            this._emit.apply(this, [type, context, event].concat(data));

            // Trigger event on default handler.
            var response = $.isFunction(this.options[type]) && this.options[type].apply(context, [event].concat(data)) === false;

            return !(response || event.isDefaultPrevented());
        };

        /**
         * Trigger an event event on instance.
         *
         * @param {String} type
         * @param {Object} context
         */
        Filepicker.prototype._emit = function (type, context) {
            var list = this.events[type] || [],
                i = 0,
                handler = void 0;

            while (handler = list[i++]) {
                handler.apply(context || this, [].slice.call(arguments, 2));
            }
        };

        /**
         * Copy original event props.
         *
         * @param {Object} event
         */
        function copyProps(event) {
            var orig = event.originalEvent;

            if (orig) {
                for (var prop in orig) {
                    if (!(prop in event)) {
                        event[prop] = orig[prop];
                    }
                }
            }
        }
    }

    function handlersMixin (Filepicker) {
        /**
         * On file input change event handler.
         *
         * @param {Object} e
         */
        Filepicker.prototype.onChange = function (e) {
            if (!(window.File && window.FileList && window.FormData)) {
                return this.trigger('uploadfallback', e, this.trans('uploadFallback'));
            }

            this.onAdd(e, { files: this._getInputFiles($(e.target)) });
        };

        /**
         * On file add event handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        Filepicker.prototype.onAdd = function (e, data) {
            var _this = this;

            var i = 0;
            var batchSize = 0;
            var fileSet = [];
            var limit = this.options.uploadMultipleLimit;
            var limitSize = this.options.uploadMultipleSize;
            var overhead = this.options.uploadMultipleSizeOverhead;
            var validate = function validate(file) {
                return _this.trigger('validate', e, file);
            };

            $.each(data.files, function (_, file) {
                return _this.addProps(file);
            });

            data.originalFiles = data.files;

            if (!this.options.uploadMultiple) {
                $.each(data.files, function (_, file) {
                    validate(file);
                    fileSet.push([file]);
                });
            } else if (limit) {
                for (i = 0; i < data.files.length; i += limit) {
                    var files = data.files.slice(i, i + limit);

                    $.each(files, function (_, file) {
                        validate(file);
                    });

                    fileSet.push(files);
                }
            } else {
                $.each(data.files, function (_, file) {
                    if (!validate(file)) {
                        batchSize += file.size + overhead;

                        if (limitSize && batchSize > limitSize) {
                            i++;
                            batchSize = file.size + overhead;
                        }
                    }

                    if (!fileSet[i]) {
                        fileSet[i] = [];
                    }

                    fileSet[i].push(file);
                });
            }

            $.each(fileSet, function (_, files) {
                var newData = $.extend({}, data, { files: files });

                _this._addMethods(newData);

                _this.trigger('add', e, newData);
            });
        };

        /**
         * On file send event handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        Filepicker.prototype.onSend = function (e, data) {
            var _this2 = this;

            var filtered = data.files.filter(function (file) {
                return !file.error;
            });

            if (filtered.length == 0) {
                return false;
            }

            if (this.trigger('send', e, data) === false) {
                return this.onFail(this.trans(data.errorThrown || 'abort'), data);
            }

            data.promise().progress(function (loaded, total) {
                return _this2.onProgress(loaded, total, data);
            }).done(function (result, xhr) {
                return _this2.onDone(xhr.responseJSON, data);
            }).fail(function (error) {
                return _this2.onFail(error, data);
            }).always(function (resultOrError) {
                return _this2.onAlways(resultOrError, data);
            });

            var parallel = this.options.parallelUploads;

            if (!parallel || parallel > this._sending) {
                this._sending++;
                data.send();
            } else {
                this._queue.push(data);
            }
        };

        /**
         * Upload progress event handler.
         *
         * @param {Number} loaded
         * @param {Number} total
         * @param {Object} data
         */
        Filepicker.prototype.onProgress = function (loaded, total, data) {
            data.progress.percentage = Math.floor(loaded / total * 100);

            this.trigger('progress', null, data);
        };

        /**
         * On data upload done handler.
         *
         * @param {Array}  result
         * @param {Object} data
         */
        Filepicker.prototype.onDone = function (result, data) {
            data.result = result;
            data.state = 'sent';

            for (var i = 0; i < data.files.length; i++) {
                data.files[i] = $.extend({ original: data.files[i] }, result[i]);
                this.addProps(data.files[i]);
            }

            this.trigger('done', null, data);
        };

        /**
         * On upload fail event handler.
         *
         * @param {String} errorThrown
         * @param {Object} data
         */
        Filepicker.prototype.onFail = function (errorThrown, data) {
            data.errorThrown = errorThrown;
            data.state = 'failed';

            this.trigger('fail', null, data);
        };

        /**
         * On upload complete event handler.
         *
         * @param {Array|String} resultOrError
         * @param {Object} data
         */
        Filepicker.prototype.onAlways = function (resultOrError, data) {
            this._processQueue();

            data.resultOrError = resultOrError;
            this.trigger('always', null, data);
        };
    }

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
    };

    initMixin(Filepicker);
    handlersMixin(Filepicker);
    eventsMixin(Filepicker);
    miscMixin(Filepicker);
    apiMixin(Filepicker);
    pluginMixin(Filepicker);

    return Filepicker;

}));