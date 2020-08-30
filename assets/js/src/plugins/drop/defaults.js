export default {
    // dropZone: undefined,

    dropWindow: '.drop-window',

    /**
     * File drop handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    drop: function (e, data) {
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
    dragover: function (e) {
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
    dragleave: function (e) {
        if (e.isDefaultPrevented()) {
            return false;
        }

        this.options.dropWindow.hide().removeClass('in');
    }
};
