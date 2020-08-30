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
        // dropZone: undefined,

        dropWindow: '.drop-window',

        /**
         * File drop handler.
         *
         * @param {Object} e
         * @param {Object} data
         */
        drop: function drop(e, data) {
            if (e.isDefaultPrevented()) {
                return false;
            }

            if (this.options.dropWindow) {
                this.options.dropWindow.hide();
            }

            this.onAdd(e, data);
        },

        /**
         * File dragover handler.
         *
         * @param {Object} e
         */
        dragover: function dragover(e) {
            if (e.isDefaultPrevented()) {
                return false;
            }

            this.options.dropWindow.show().addClass('in');
        },

        /**
         * File dragleave handler.
         *
         * @param {Object} e
         */
        dragleave: function dragleave(e) {
            if (e.isDefaultPrevented()) {
                return false;
            }

            this.options.dropWindow.hide().removeClass('in');
        }
    };

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

        var o = this.options;

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
    };

    Drop.prototype.onDragOver = getDragHandler('dragover');
    Drop.prototype.onDragEnter = getDragHandler('dragenter');
    Drop.prototype.onDragLeave = getDragHandler('dragleave');

    /**
     * On file drop event handler.
     *
     * @param {Object} e
     */
    Drop.prototype.onDrop = function (e) {
        var dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;

        if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
            e.preventDefault();

            var data = { files: $.makeArray(dataTransfer.files) };

            this.$f.trigger('drop', e, data);
        }
    };

    /**
     * Get drag handler.
     *
     * @param  {String} type
     * @return {Function}
     */
    function getDragHandler(type) {
        return function (e) {
            var dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;

            if (dataTransfer && $.inArray('Files', dataTransfer.types) !== -1 && this.$f.trigger(type, e) !== false) {
                e.preventDefault();

                if (type === 'dragover') {
                    dataTransfer.dropEffect = 'copy';
                }
            }
        };
    }

    /**
     * Register the plugin.
     */
    Filepicker.plugin('drop', Drop);

}));