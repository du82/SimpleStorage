import $ from 'jquery';

export default {
    ui: {
        autoLoad: true,
        autoUpload: true,
        perPage: 15,
        refreshPagination: false,
        prependFiles: true,
        previewThumbnailSize: [64, 64],
        timeago: false,
        // startAll: undefined,
        // cancelAll: undefined,
        // deleteAll: undefined,
        // filesList: undefined,
        // pagination: undefined,
        selectors: {
            filesList: '.files',
            preview: '.preview',
            progress: '.progress-bar',
            error: '.error',
            start: '.start',
            cancel: '.cancel',
            'delete': '.delete',
            startAll: '.start-all',
            cancelAll: '.cancel-all',
            deleteAll: '.delete-all',
            pagination: '.pagination-container'
        },
        uploadTemplateId: 'uploadTemplate',
        downloadTemplateId: 'downloadTemplate',
        paginationTemplateId: 'paginationTemplate'
    },

    messages: {
        processing: 'Processing...',
        deleteFail: 'Could not delete file :file.'
    },

    /**
     * Add handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    add: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.trigger('renderupload', e, data);

        if (this.options.ui.autoUpload || data.autoUpload) {
            this.onSend(e, data);
        }
    },

    /**
     * Progress handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    progress: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        $.each(data.files, (_, file) => {
            const p = data.progress.percentage;

            file.context.find(this.options.ui.selectors.progress)
                        .text(p === 100 ? this.trans('processing') : p + '%')
                        .css('width', p + '%');
        });
    },

    /**
     * Upload done handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    done: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.trigger('renderdownload', e, data);
    },

    /**
     * Upload fail handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    fail: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        const s = this.options.ui.selectors;

        $.each(data.files, (_, file) => {
            file.context.find(s.error).text(this.trans(data.errorThrown));
            file.context.find(s.progress).text('').css('width', '0%');
            file.context.find(s.start).prop('disabled', false);
        });
    },

    /**
     * Upload always handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    always: function (e, data) {
        $.each(data.files, (_, file) => {
            file.context.find(this.options.ui.selectors.progress).parent().hide();
        });

        if (this._sending == 0 && this.options.ui.refreshPagination) {
            this.plugins.ui.fetchFiles();
        }
    },

    /**
     * Files load handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    load: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.trigger('renderdownload', e, data);
    },

    /**
     * Start upload handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    start: function (e, data) {
        if (e.isDefaultPrevented()) {
            $.each(data.files, (_, file) => {
                file.context.find(this.options.ui.selectors.start)
                            .prop('disabled', false);
            });
        } else {
            this.onSend(e, data);
        }
    },

    /**
     * Cancel upload handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    cancel: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        $.each(data.files, (_, file) => file.context.remove());
    },

    /**
     * Render uploaded file.
     *
     * @param {Object} e
     * @param {Object} data
     */
    renderupload: function (e, data) {
        $.each(data.files, (_, file) => {
            file.autoUpload = this.options.ui.autoUpload;

            file.context = this.plugins.ui.renderTemplate(
                this.options.ui.uploadTemplateId,
                {file: file}
            );

            file.context.data('data', data);

            if (file.imageFile) {
                this.plugins.ui.renderThumbnailPreview(file);
            }

            const method = this.options.ui.prependFiles ? 'prepend' : 'append';

            this.options.ui.filesList[method](file.context);

            file.context.addClass('in');
        });

        this.trigger('renderdone', e, data);
    },

    /**
     * Render download file.
     *
     * @param {Object} e
     * @param {Object} data
     */
    renderdownload: function (e, data) {
        $.each(data.files, (_, file) => {
            this.addProps(file);

            file.context = this.plugins.ui.renderTemplate(
                this.options.ui.downloadTemplateId,
                {file: file}
            );

            file.context.find(this.options.ui.selectors['delete'])
                        .data('filename', file.name);

            if (file.original) {
                file.original.context.removeClass('in');
                file.original.context.replaceWith(file.context);
                file.context.data('data', data);
            } else {
                this.options.ui.filesList.append(file.context);
            }

            file.context.addClass('in');
        });

        this.trigger('renderdone', e, data);
    },

    /**
     * Render done handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    renderdone: function (e, data) {
        if (this.options.ui.timeago && $.fn.timeago) {
            $.each(data.files, (_, file) => {
                file.context.find('time').timeago();
            });
        }
    },

    /**
     * Render pagination handler.
     *
     * @param {Object} e
     * @param {Objct} data
     */
    renderpagination: function (e, data) {
        this.options.filesList.children().remove();

        this.options.pagination.html(
            this.renderTemplate(
                this.options.paginationTemplateId,
                data
            )
        );
    },

    /**
     * File delete handler.
     *
     * @param {Object} e
     * @param {Object} data {context:, filename:}
     */
    'delete': function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this['delete'](data.filename)
            .done((_, __, jqXHR) => this.trigger('deletedone', e, [data, jqXHR]))
            .fail((jqXHR) => this.trigger('deletefail', e, [data, jqXHR]))
            .always((datajqXHR) => this.trigger('deletealways', e, [data, datajqXHR]));
    },

    /**
     * Delete done handler.
     *
     * @param {Object} e
     * @param {Object} data {context:, filename:}
     * @param {Object} jqXHR
     */
    deletedone: function (e, data, jqXHR) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        if (jqXHR.responseJSON[data.filename] !== true) {
            return this.trigger('deletefail', e, [data, jqXHR]);
        }

        if (data.context) {
            data.context.remove();
        }

        if (this.options.ui.pagination &&
            this.options.ui.filesList.children().length == 0) {
            this.plugins.ui.fetchFiles(-1);
        }
    },

    /**
     * Delete fail handler.
     *
     * @param {Object} e
     * @param {Object} data {context:, filename:}
     */
    deletefail: function (e, data) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        alert(this.trans('deleteFail', {file: data.filename}));
    },

    /**
     * Start all handler.
     *
     * @param {Object} e
     */
    startall: function (e) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.options.ui.filesList.find(this.options.ui.selectors.start)
                                    .trigger('click');
    },

    /**
     * Cancel all handler.
     *
     * @param {Object} e
     */
    cancelall: function (e) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.options.ui.filesList.find(this.options.ui.selectors.cancel)
                                    .trigger('click');
    },

    /**
     * Delete all handler.
     *
     * @param {Object} e
     */
    deleteall: function (e) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.options.ui.filesList.find(this.options.ui.selectors['delete'])
                                    .trigger('click');
    }
};
