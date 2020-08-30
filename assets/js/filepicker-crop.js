/**
 * This file is part of Filepicker.
 *
 * Copyright (c) 2016 Cretu Eusebiu <hazzardweb@gmail.com>
 *
 * For the full copyright and license information, please visit:
 * http://codecanyon.net/licenses/standard
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('jquery'), require('filepicker')) :
    typeof define === 'function' && define.amd ? define(['jquery', 'filepicker'], factory) :
    (factory(global.jQuery,global.Filepicker));
}(this, function ($,Filepicker) { 'use strict';

    $ = 'default' in $ ? $['default'] : $;
    Filepicker = 'default' in Filepicker ? Filepicker['default'] : Filepicker;

    var defaults = {
        crop: {
            // container: undefined,
            // loading: undefined,
            // _preview: undefined,
            // showBtn: undefined
            // hideBtn: undefined
            // saveBtn: undefined,
            // rotateLeftBtn: undefined,
            // rotateRightBtn: undefined,
            // flipHorizontal: undefined,
            // flipVertical: undefined,

            selectors: {
                crop: '.crop',
                container: '#crop-modal',
                loading: '.crop-loading',
                preview: '.crop-preview',
                save: '.crop-save',
                hide: '.crop-hide',
                rotateLeft: '.crop-rotate-left',
                rotateRight: '.crop-rotate-right',
                flipHorizontal: '.crop-flip-horizontal',
                flipVertical: '.crop-flip-vertical'
            },

            guides: false,
            center: false,
            movable: false,
            zoomable: false,
            setDragMode: 'crop',
            viewMode: 1
            // aspectRatio:
        },

        messages: {
            cropLoadFail: 'Could not load the image.',
            cropSaveFail: 'Could not save the image.'
        },

        /**
         * Crop save done handler.
         *
         * @param {Object} e
         * @param {Object} file
         * @param {Object} jqXHR
         */
        cropsave: function cropsave(e, file) {
            // Replace file from filesList in the UI plugin.
            if (file.original) {
                this.trigger('renderdownload', e, { files: [file] });
            }

            this.plugins.crop.hide();
        },

        /**
         * Crop save fail handler.
         *
         * @param {Object} e
         * @param {Object} jqXHR
         */
        cropsavefail: function cropsavefail(e, jqXHR) {
            alert(jqXHR.responseJSON || this.trans('cropSaveFail'));
        },

        /**
         * Crop save always handler.
         *
         * @param {Object} e
         * @param {Object} data|jqXHR
         */
        cropsavealways: function cropsavealways() {
            this.plugins.crop.toggleSaveBtn();
            this.plugins.crop.image.cropper('enable');
        },

        /**
         * Crop image load handler.
         *
         * @param {Object} e
         * @param {Object} image
         */
        cropload: function cropload(e, image) {
            var crop = this.plugins.crop;

            if (crop.options.loading) {
                crop.options.loading.hide();
            }

            crop.options._preview.html(image).show();
            crop.image = image.cropper(crop.options);
            crop.options.saveBtn.prop('disabled', false);

            this.trigger('cropper', e, [crop.image]);
        },

        /**
         * Crop image load fail handler.
         *
         * @param {Object} e
         */
        croploadfail: function croploadfail() {
            alert(this.trans('cropLoadFail'));
        }

        /**
         * Cropper ready handler.
         *
         * @param {Object} e
         * @param {Object} image
         */
        // cropper: function (e, image) {}
    };

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
    };

    /**
     * Initialize options.
     */
    Crop.prototype._initOptions = function () {
        var o = this.options;
        var s = this.options.selectors;

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
    };

    /**
     * Initialize event handlers.
     */
    Crop.prototype._initHandlers = function () {
        var _this = this;

        var o = this.options;

        this.on(o.showBtn, 'click', this.show);
        this.on(o.saveBtn, 'click', this.save);
        this.on(o.hideBtn, 'click', this.hide);
        this.on(o.rotateLeftBtn, 'click', function () {
            return _this.rotate(-90);
        });
        this.on(o.rotateRightBtn, 'click', function () {
            return _this.rotate(90);
        });

        this.on(o.flipHorizontal, 'click', function () {
            if (_this.image) {
                var scaleX = _this.image.cropper('getData').scaleX;

                _this.image.cropper('scaleX', scaleX == 1 ? -1 : 1);
            }
        });

        this.on(o.flipVertical, 'click', function () {
            if (_this.image) {
                var scaleY = _this.image.cropper('getData').scaleY;

                _this.image.cropper('scaleY', scaleY == 1 ? -1 : 1);
            }
        });

        if (this.isModal()) {
            o.container.on('hidden.bs.modal', function () {
                return _this.hide();
            }).on('shown.bs.modal', function (e) {
                _this.loadPreview(e.relatedTarget.fileurl ? e.relatedTarget.fileurl : $(e.relatedTarget.currentTarget));
            });
        }

        if (this.$f.plugins.ui) {
            // Listen for click events on the crop button.
            this.on(this.$f.element, 'click', o.selectors.crop, this.show);

            // Add a "fileurl" data attribute to each crop button.
            this.$f.on('renderdone', function (e, data) {
                $.each(data.files, function (_, file) {
                    file.context.find(o.selectors.crop).data('fileurl', file.url);
                });
            });
        }
    };

    /**
     * Show crop container / modal.
     *
     * @param {Object|String} e
     */
    Crop.prototype.show = function (e) {
        if ($.type(e) === 'object') {
            e.preventDefault();
        } else {
            var url = e;
            e = $.Event('click');
            e.fileurl = url;
        }

        if (this.isModal()) {
            this.options.container.modal('show', e);
        } else {
            this.options.container.show();
            this.loadPreview($(e.currentTarget));
        }
    };

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
    };

    /**
     * Load cropper image preivew.
     *
     * @param {String} target
     */
    Crop.prototype.loadImage = function (src) {
        var _this2 = this;

        var image = $('<img>', { src: addTimestamp(src), class: 'img-responsive' });

        image.on('load', function (e) {
            return _this2.trigger('cropload', e, image);
        }).on('error', function (e) {
            return _this2.trigger('croploadfail', e, image);
        });
    };

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
    };

    /**
     * Save cropped image.
     *
     * @param {Object} e
     */
    Crop.prototype.save = function (e) {
        var _this3 = this;

        this.toggleSaveBtn();

        this.image.cropper('disable');

        var data = this.image.cropper('getData');

        this.$f.update(this.getFilename(), data).done(function (file, _, jqXHR) {
            if (file.versions && file.versions.thumb) {
                file.versions.thumb.url = addTimestamp(file.versions.thumb.url);
            }

            if (_this3.fileContext) {
                file.original = { context: _this3.fileContext };
            }

            _this3.trigger('cropsave', e, [file, jqXHR]);
        }).fail(function (jqXHR) {
            return _this3.trigger('cropsavefail', e, jqXHR);
        }).always(function (datajqXHR) {
            return _this3.trigger('cropsavealways', e, datajqXHR);
        });
    };

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

        var image = this.image;
        var contData = image.cropper('getContainerData');

        image.cropper('setCropBoxData', {
            width: 2,
            height: 2,
            top: contData.height / 2 - 1, left: contData.width / 2 - 1
        });

        image.cropper('rotate', degree);

        var newCanvData = void 0;
        var canvData = image.cropper('getCanvasData');
        var newWidth = canvData.width * (contData.height / canvData.height);

        if (newWidth >= contData.width) {
            var newHeight = canvData.height * (contData.width / canvData.width);

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
    };

    /**
     * Get cropper image filename.
     *
     * @return {String}
     */
    Crop.prototype.getFilename = function () {
        var file = this.image.attr('src');

        if (file.indexOf('?file=') > -1) {
            file = file.substr(file.indexOf('?file=') + 6);
        }

        if (file.indexOf('?') > -1 || file.indexOf('&') > -1) {
            file = file.substr(0, file.length - 14);
        }

        return decodeURI(file);
    };

    /**
     * Toggle save button.
     */
    Crop.prototype.toggleSaveBtn = function () {
        var btn = this.options.saveBtn;

        if ($.fn.button) {
            if (btn.button().data('bs.button').isLoading) {
                btn.button('reset');
            } else {
                btn.button('loading');
            }
        } else {
            btn.prop('disabled', !btn.prop('disabled'));
        }
    };

    /**
     * Detect Bootstrap modal support.
     *
     * @return {Boolean}
     */
    Crop.prototype.isModal = function () {
        return this.options.container && this.options.container.hasClass('modal');
    };

    /**
     * Add a timestamp at the end of the source.
     *
     * @param {String} src
     */
    function addTimestamp(src) {
        return src += (src.indexOf('?') > -1 ? '&' : '?') + new Date().getTime();
    }

    /**
     * Register the plugin.
     */
    Filepicker.plugin('crop', Crop);

}));
