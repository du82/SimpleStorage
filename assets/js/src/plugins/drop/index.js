import $ from 'jquery';
import defaults from './defaults';
import Filepicker from 'filepicker';

/**
 * Create a new plugin instance.
 *
 * @param {Filepicker} filepicker
 */
function Drop(filepicker) {
    filepicker.extend(this, defaults);
}

/**
 * Initialize pluigin.
 */
Drop.prototype.init = function () {
    this.options = this.$f.options;

    const o = this.options;

    if (o.dropZone === undefined) {
        o.dropZone = $(document);
    }

    if (!(o.dropWindow instanceof $)) {
        o.dropWindow = this.$f.element.find(o.dropWindow);
    }

    this.on(o.dropZone, 'dragover', this.onDragOver);
    this.on(o.dropZone, 'dragenter', this.onDragEnter);
    this.on(o.dropZone, 'dragleave', this.onDragLeave);
    this.on(o.dropZone, 'drop', this.onDrop);
}

Drop.prototype.onDragOver  = getDragHandler('dragover');
Drop.prototype.onDragEnter = getDragHandler('dragenter');
Drop.prototype.onDragLeave = getDragHandler('dragleave');

/**
 * On file drop event handler.
 *
 * @param {Object} e
 */
Drop.prototype.onDrop = function (e) {
    const dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;

    if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
        e.preventDefault();

        const data = {files: $.makeArray(dataTransfer.files)};

        this.$f.trigger('drop', e, data);
    }
}

/**
 * Get drag handler.
 *
 * @param  {String} type
 * @return {Function}
 */
function getDragHandler (type) {
    return function (e) {
        const dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;

        if (dataTransfer && $.inArray('Files', dataTransfer.types) !== -1 &&
                                        this.$f.trigger(type, e) !== false) {
            e.preventDefault();

            if (type === 'dragover') {
                dataTransfer.dropEffect = 'copy';
            }
        }
    }
}

/**
 * Register the plugin.
 */
Filepicker.plugin('drop', Drop);
