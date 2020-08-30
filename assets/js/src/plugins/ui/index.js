import $ from 'jquery';
import tmpl from './tmpl';
import defaults from './defaults';
import Filepicker from 'filepicker';

/**
 * Create a new plugin instance.
 *
 * @param {Filepicker} filepicker
 */
function UI(filepicker) {
    filepicker.extend(this, defaults);
}

/**
 * Initialize.
 */
UI.prototype.init = function () {
    this.options = this.$f.options.ui;

    const o = this.options;
    const el = this.$f.element;
    const s = this.options.selectors;

    if (!o.filesList) {
        o.filesList = el.find(s.filesList);
    }

    if (!o.pagination) {
        o.pagination = el.find(s.pagination);
    }

    this.on(o.filesList, 'click', s.start, this.onStart);
    this.on(o.filesList, 'click', s.cancel, this.onCancel);
    this.on(o.filesList, 'click', s['delete'], this.onDelete);

    this.on(o.startAll || el, 'click', o.startAll ? null : s.startAll, this.onStartAll);
    this.on(o.cancelAll || el, 'click', o.cancelAll ? null : s.cancelAll, this.onCancelAll);
    this.on(o.deleteAll || el, 'click', o.deleteAll ? null : s.deleteAll, this.onDeleteAll);

    this._currentPage = 1;

    if (o.autoLoad) {
        if (o.perPage) {
            this.on(this.options.pagination, 'click', 'a', this.onPageClick);
            this.fetchFiles();
        } else {
            this.$f.fetch().done((result) => {
                this.$f.trigger('load', null, result);
            });
        }
    }
}

/**
 * On page click handler.
 *
 * @param {Object} e
 */
UI.prototype.onPageClick = function (e) {
    e.preventDefault();

    const page = parseInt($(e.target).data('page'));

    if (page) {
        this.fetchFiles(page);
    }
}

/**
 * Fetch files.
 *
 * @param {Number} page
 */
UI.prototype.fetchFiles = function (page = 1) {
    this._currentPage = page == -1 ? this._currentPage - 1 : page;

    if (this._currentPage < 1) {
        this._currentPage = 1;
    }

    const options = {
        limit: this.options.perPage,
        offset: this._currentPage * this.options.perPage - this.options.perPage
    };

    this.$f.fetch(options).done((result) => {
        this.renderPagination(result);
    });
}

/**
 * Render pagination.
 *
 * @param {Object} result {files: [], total: 0}
 */
UI.prototype.renderPagination = function (result) {
    let firstAdj = 0;
    let lastAdj = 0;
    const span = 1;
    const currentPage = this._currentPage;
    const lastPage = Math.ceil(result.total / this.options.perPage);
    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = lastPage > currentPage ? currentPage + 1 : null;

    if (currentPage <= span * 2) {
        firstAdj = 1;
        lastAdj = Math.min(1 + 2 * span, lastPage);
    } else if (currentPage > lastPage - 2 * span) {
        firstAdj = lastPage - 2 * span;
        lastAdj = lastPage;
    } else {
        firstAdj = currentPage - span;
        lastAdj = currentPage + span;
    }

    const data = {
        total: result.total,
        currentPage: currentPage,
        prevPage: prevPage,
        nextPage: nextPage,
        lastPage: lastPage,
        firstAdjacentPage: firstAdj,
        lastAdjacentPage: lastAdj
    };

    this.$f.trigger('renderpagination', null, data, this);
    this.$f.trigger('load', null, result);
}

/**
 * Start file upload event handler.
 *
 * @param {Object} e
 */
UI.prototype.onStart = function (e) {
    e.preventDefault();

    const button = $(e.currentTarget);
    const item = button.closest('.upload-template');
    const data = item.data('data');

    button.prop('disabled', true);

    if (data && data.send) {
        this.$f.trigger('start', e, data);
    }
}

/**
 * Cancel upload event handler.
 *
 * @param {Object} e
 */
UI.prototype.onCancel = function (e) {
    e.preventDefault();

    const item = $(e.currentTarget).closest('.upload-template,.download-template');
    const data = item.data('data') || {};

    if (data.abort) {
        data.abort();
    }

    this.$f.trigger('cancel', e, data);
}

/**
 * Delete file event handler.
 *
 * @param {Object} e
 */
UI.prototype.onDelete = function (e) {
    e.preventDefault();

    const button = $(e.currentTarget);

    this.$f.trigger('delete', e, {
        filename: button.data('filename'),
        context: button.closest('.download-template')
    });
}

/**
 * Start all file uploads event handler.
 *
 * @param {Object} e
 */
UI.prototype.onStartAll = function (e) {
    e.preventDefault();
    this.$f.trigger('startall', e);
}

/**
 * Cancel all file upload event handler.
 *
 * @param {Object} e
 */
UI.prototype.onCancelAll = function (e) {
    e.preventDefault();
    this.$f.trigger('cancelall', e);
}

/**
 * Delete all files event handler.
 *
 * @param {Object} e
 */
UI.prototype.onDeleteAll = function (e) {
    e.preventDefault();
    this.$f.trigger('deleteall', e);
}

/**
 * Render template.
 *
 * @param  {String} templateId
 * @param  {Object} data
 * @return {Object} jQuery object
 */
UI.prototype.renderTemplate = function (templateId, data) {
    return $(tmpl(templateId, data));
}

/**
 * Render image thumbnail preview.
 *
 * @param {Object} file
 */
UI.prototype.renderThumbnailPreview = function (file) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const image = new Image();

    canvas.width = this.options.previewThumbnailSize[0];
    canvas.height = this.options.previewThumbnailSize[1];

    image.onload = () => {
        context.drawImage(image, 0, 0, 80, 80 * image.height / image.width);
        file.context.find(this.options.selectors.preview).html(canvas);
    }

    image.src = window.URL.createObjectURL(file);
}

/**
 * Register the plugin.
 */
Filepicker.plugin('ui', UI);
