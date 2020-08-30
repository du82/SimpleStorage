import $ from 'jquery';
import defaults from './defaults';
import Filepicker from 'filepicker';

/**
 * Create a new plugin instance.
 *
 * @param {Filepicker} filepicker
 */
function Crop(filepicker) {
    filepicker.extend(this, defaults);
}

/**
 * Initialize plugin.
 */
Crop.prototype.init = function () {
    this.options = this.$f.options.crop;

    this._initOptions();
    this._initHandlers();
}

/**
 * Initialize options.
 */
Crop.prototype._initOptions = function () {
    const o = this.options;
    const s = this.options.selectors;

    if (!o.container) {
        o.container = $(s.container);
    }

    if (!o.container) {
        return false;
    }

    if (!o.loading) {
        o.loading = o.container.find(s.loading);
    }

    if (!o._preview) {
        o._preview = o.container.find(s.preview);
    }

    if (!o.saveBtn) {
        o.saveBtn = o.container.find(s.save);
        o.saveBtn.prop('disabled', true);
    }

    if (!o.hideBtn) {
        o.hideBtn = o.container.find(s.hide);
    }

    if (!o.rotateLeftBtn) {
        o.rotateLeftBtn = o.container.find(s.rotateLeft);
    }

    if (!o.rotateRightBtn) {
        o.rotateRightBtn = o.container.find(s.rotateRight);
    }

    if (!o.flipHorizontal) {
        o.flipHorizontal = o.container.find(s.flipHorizontal);
    }

    if (!o.flipVertical) {
        o.flipVertical = o.container.find(s.flipVertical);
    }
}

/**
 * Initialize event handlers.
 */
Crop.prototype._initHandlers = function () {
    const o = this.options;

    this.on(o.showBtn, 'click', this.show);
    this.on(o.saveBtn, 'click', this.save);
    this.on(o.hideBtn, 'click', this.hide);
    this.on(o.rotateLeftBtn, 'click', () => this.rotate(-90));
    this.on(o.rotateRightBtn, 'click', () => this.rotate(90));

    this.on(o.flipHorizontal, 'click', () => {
        if (this.image) {
            const scaleX = this.image.cropper('getData').scaleX;

            this.image.cropper('scaleX', scaleX == 1 ? -1 : 1);
        }
    });

    this.on(o.flipVertical, 'click', () => {
        if (this.image) {
            const scaleY = this.image.cropper('getData').scaleY;

            this.image.cropper('scaleY', scaleY == 1 ? -1 : 1);
        }
    });

    if (this.isModal()) {
        o.container.on('hidden.bs.modal', () => this.hide())
            .on('shown.bs.modal', (e) => {
                this.loadPreview(e.relatedTarget.fileurl ?
                    e.relatedTarget.fileurl : $(e.relatedTarget.currentTarget));
            });
    }

    if (this.$f.plugins.ui) {
        // Listen for click events on the crop button.
        this.on(this.$f.element, 'click', o.selectors.crop, this.show);

        // Add a "fileurl" data attribute to each crop button.
        this.$f.on('renderdone', (e, data) => {
            $.each(data.files, (_, file) => {
                file.context.find(o.selectors.crop)
                            .data('fileurl', file.url);
            });
        });
    }
}

/**
 * Show crop container / modal.
 *
 * @param {Object|String} e
 */
Crop.prototype.show = function (e) {
    if ($.type(e) === 'object') {
        e.preventDefault();
    } else {
        const url = e;
        e = $.Event('click');
        e.fileurl = url;
    }

    if (this.options.loading) {
        this.options.loading.show();
    }

    if (this.isModal()) {
        this.options.container.modal('show', e);
    } else {
        this.options.container.show();
        this.loadPreview($(e.currentTarget));
    }
}

/**
 * Load cropper preivew.
 *
 * @param {Object|String} target
 */
Crop.prototype.loadPreview = function (target) {
    if (target instanceof $) {
        this.fileContext = $(target).closest('.download-template');
        this.loadImage($(target).data('fileurl'));
    } else {
        this.loadImage(target);
    }
}

/**
 * Load cropper image preivew.
 *
 * @param {String} target
 */
Crop.prototype.loadImage = function (src) {
    const image = $('<img>', {src: addTimestamp(src), class: 'img-responsive'});

    image.on('load', (e) => this.trigger('cropload', e, image))
        .on('error', (e) => this.trigger('croploadfail', e, image));
}

/**
 * Hide crop container / modal.
 */
Crop.prototype.hide = function () {
    if (this.isModal()) {
        this.options.container.modal('hide');
    } else {
        this.options.container.hide();
    }

    this.options._preview.html('');
}

/**
 * Save cropped image.
 *
 * @param {Object} e
 */
Crop.prototype.save = function (e) {
    this.toggleSaveBtn();

    this.image.cropper('disable');

    const data = this.image.cropper('getData');

    this.$f.update(this.getFilename(), data)
    .done((file, _, jqXHR) => {
        if (file.versions && file.versions.thumb) {
            file.versions.thumb.url = addTimestamp(file.versions.thumb.url);
        }

        if (this.fileContext) {
            file.original = {context: this.fileContext};
        }

        this.trigger('cropsave', e, [file, jqXHR]);
    })
    .fail((jqXHR) => this.trigger('cropsavefail', e, jqXHR))
    .always((datajqXHR) => this.trigger('cropsavealways', e, datajqXHR));
}

/**
 * Rotate the canvas (image wrapper) with a relative degree.
 *
 * http://stackoverflow.com/a/32966453/860041
 *
 * @param {Number} degree
 */
Crop.prototype.rotate = function (degree) {
    if (!this.image) {
        return false;
    }

    const image = this.image;
    const contData = image.cropper('getContainerData');

    image.cropper('setCropBoxData',{
        width: 2,
        height: 2,
        top: (contData.height/ 2) - 1, left: (contData.width / 2) - 1
    });

    image.cropper('rotate', degree);

    let newCanvData;
    const canvData = image.cropper('getCanvasData');
    const newWidth = canvData.width * (contData.height / canvData.height);

    if (newWidth >= contData.width) {
        const newHeight = canvData.height * (contData.width / canvData.width);

        newCanvData = {
            width: contData.width,
            height: newHeight,
            top: (contData.height - newHeight) / 2,
            left: 0
        };
    } else {
        newCanvData = {
            width: newWidth,
            height: contData.height,
            top: 0,
            left: (contData.width - newWidth) / 2
        };
    }

    image.cropper('setCanvasData', newCanvData);

    newCanvData.top = newCanvData.top + newCanvData.height * 0.1;
    newCanvData.left = newCanvData.left + newCanvData.width * 0.1;
    newCanvData.height = newCanvData.height * 0.8;
    newCanvData.width = newCanvData.width * 0.8;

    image.cropper('setCropBoxData', newCanvData);
}

/**
 * Get cropper image filename.
 *
 * @return {String}
 */
Crop.prototype.getFilename = function () {
    let file = this.image.attr('src');

    if (file.indexOf('?file=') > -1) {
        file = file.substr(file.indexOf('?file=') + 6);
    }

    if (file.indexOf('?') > -1 || file.indexOf('&') > -1) {
        file = file.substr(0, file.length - 14);
    }

    return decodeURI(file);
}

/**
 * Toggle save button.
 */
Crop.prototype.toggleSaveBtn = function () {
    const btn = this.options.saveBtn;

    if ($.fn.button) {
        if (btn.button().data('bs.button').isLoading) {
            btn.button('reset');
        } else {
            btn.button('loading');
        }
    } else {
        btn.prop('disabled', !btn.prop('disabled'));
    }
}

/**
 * Detect Bootstrap modal support.
 *
 * @return {Boolean}
 */
Crop.prototype.isModal = function () {
    return this.options.container &&
        this.options.container.hasClass('modal');
}

/**
 * Add a timestamp at the end of the source.
 *
 * @param {String} src
 */
function addTimestamp (src) {
    return (src += (src.indexOf('?') > -1 ? '&' : '?') + new Date().getTime());
}

/**
 * Register the plugin.
 */
Filepicker.plugin('crop', Crop);
