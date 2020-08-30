export default {
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
    cropsave: function (e, file) {
        // Replace file from filesList in the UI plugin.
        if (file.original) {
            this.trigger('renderdownload', e, {files: [file]});
        }

        this.plugins.crop.hide();
    },

    /**
     * Crop save fail handler.
     *
     * @param {Object} e
     * @param {Object} jqXHR
     */
    cropsavefail: function (e, jqXHR) {
        alert(jqXHR.responseJSON || this.trans('cropSaveFail'));
    },

    /**
     * Crop save always handler.
     *
     * @param {Object} e
     * @param {Object} data|jqXHR
     */
    cropsavealways: function () {
        this.plugins.crop.toggleSaveBtn();
        this.plugins.crop.image.cropper('enable');
    },

    /**
     * Crop image load handler.
     *
     * @param {Object} e
     * @param {Object} image
     */
    cropload: function (e, image) {
        const crop = this.plugins.crop;

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
    croploadfail: function () {
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
