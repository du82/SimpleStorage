export default {
    camera: {
        // container: undefined,
        // preview: undefined,
        // showBtn: undefined,
        // hideBtn: undefined,
        // captureBtn: undefined,
        constraints: {},
        flipHorizontal: true,

        selectors: {
            container: '#camera-modal',
            show: '.camera-show',
            hide: '.camera-hide',
            capture: '.camera-capture',
            preview: '.camera-preview'
        }
    },

    messages: {
        cameraError: 'Could not access the camera.',
        cameraFallback: 'Your browser does not support the camera feature.'
    },

    /**
     * Camera capture handler.
     *
     * @param {Object} e
     * @param {Object} data
     */
    cameracapture: function (e, data) {
        this.onAdd(e, data);

        this.plugins.camera.hide();
    },

    /**
     * Camera success handler.
     *
     * @param {Object} e
     * @param {MediaStream} stream
     */
    camerasuccess: function (e, stream) {
        const camera = this.plugins.camera;

        camera.stream = stream;

        if ('srcObject' in camera.video[0]) {
            camera.video[0].srcObject = stream;
        } else {
            camera.video.attr('src', window.URL.createObjectURL(stream));
        }

        // Enable capture button when video is loaded.
        camera.video.on('loadedmetadata', () => {
            camera.options.captureBtn.prop('disabled', false);
        });

        // Flip video preview if necessary.
        if (camera.options.flipHorizontal) {
            camera.flipHorizontal();
        }
    },

    /**
     * Camera error handler.
     *
     * @param {Object} e
     * @param {Object} error
     */
    cameraerror: function (e, error) {
        alert(this.trans('cameraError', {error: error}));

        this.plugins.camera.hide();
    },

    /**
     * Camera fallback handler.
     *
     * @param {Object} e
     * @param {String} message
     */
    camerafallback: function (e, message) {
        alert(message);
    }
};
