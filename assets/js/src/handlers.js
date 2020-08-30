import $ from 'jquery';

export default function (Filepicker) {
    /**
     * On file input change event handler.
     *
     * @param {Object} e
     */
    Filepicker.prototype.onChange = function (e) {
        if (!(window.File && window.FileList && window.FormData)) {
            return this.trigger('uploadfallback', e, this.trans('uploadFallback'));
        }

        this.onAdd(e, {files: this._getInputFiles($(e.target))});
    }

    /**
     * On file add event handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    Filepicker.prototype.onAdd = function (e, data) {
        let i = 0;
        let batchSize = 0;
        const fileSet = [];
        const limit = this.options.uploadMultipleLimit;
        const limitSize = this.options.uploadMultipleSize;
        const overhead = this.options.uploadMultipleSizeOverhead;
        const validate = (file) => this.trigger('validate', e, file);

        $.each(data.files, (_, file) => this.addProps(file));

        data.originalFiles = data.files;

        if (!this.options.uploadMultiple) {
            $.each(data.files, (_, file) => {
                validate(file);
                fileSet.push([file]);
            });
        } else if (limit) {
            for (i = 0; i < data.files.length; i += limit) {
                let files = data.files.slice(i, i + limit);

                $.each(files, (_, file) => {
                    validate(file);
                });

                fileSet.push(files);
            }
        } else {
            $.each(data.files, (_, file) => {
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

        $.each(fileSet, (_, files) => {
            const newData = $.extend({}, data, {files: files});

            this._addMethods(newData);

            this.trigger('add', e, newData);
        });
    }

    /**
     * On file send event handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    Filepicker.prototype.onSend = function (e, data) {
        const filtered = data.files.filter((file) => !file.error);

        if (filtered.length == 0) {
            return false;
        }

        if (this.trigger('send', e, data) === false) {
            return this.onFail(this.trans(data.errorThrown || 'abort'), data);
        }

        data.promise()
            .progress((loaded, total) => this.onProgress(loaded, total, data))
            .done((result, xhr) => this.onDone(xhr.responseJSON, data))
            .fail((error) => this.onFail(error, data))
            .always((resultOrError) => this.onAlways(resultOrError, data));

        const parallel = this.options.parallelUploads;

        if (!parallel || parallel > this._sending) {
            this._sending++;
            data.send();
        } else {
            this._queue.push(data);
        }
    }

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
    }

    /**
     * On data upload done handler.
     *
     * @param {Array}  result
     * @param {Object} data
     */
    Filepicker.prototype.onDone = function (result, data) {
        data.result = result;
        data.state = 'sent';

        for (let i = 0; i < data.files.length; i++) {
            data.files[i] = $.extend({original: data.files[i]}, result[i]);
            this.addProps(data.files[i]);
        }

        this.trigger('done', null, data);
    }

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
    }

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
    }
}
