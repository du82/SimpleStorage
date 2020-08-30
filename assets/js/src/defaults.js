export default {
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
    add: function (e, data) {
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
    validate: function (e, file) {
        const o = this.options;

        if (o.acceptFileTypes && !o.acceptFileTypes.test(file.name)) {
            file.error = this.trans('invalidFileType');
        } else if (file.size !== undefined && o.maxFileSize && file.size > o.maxFileSize) {
            file.error = this.trans('maxFileSize', {max: o.maxFileSize / 1000});
        } else if (file.size !== undefined && o.minFileSize && file.size < o.minFileSize) {
            file.error = this.trans('minFileSize', {min: o.minFileSize / 1000});
        }

        return file.error === undefined;
    },

    /**
     * Upload fallback handler.
     *
     * @param {Object} e
     * @param {String} message
     */
    uploadfallback: function (e, message) {
        alert(message);
    }
};
