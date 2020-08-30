import $ from 'jquery';
import defaults from './defaults';
import Filepicker from 'filepicker';

/**
 * Create a new plugin instance.
 *
 * @param {Filepicker} filepicker
 */
function Camera(filepicker) {
    filepicker.extend(this, defaults);
}

/**
 * Initialize.
 */
Camera.prototype.init = function () {
    this.options = this.$f.options.camera;

    this._initOptions();
    this._initHandlers();
}

/**
 * Initialize options.
 */
Camera.prototype._initOptions = function () {
    const o = this.options;
    const s = this.options.selectors;

    this.mediaDevices = this._getMediaDevices();

    if (!o.container) {
        o.container = $(s.container);
    }

    if (!o.container) {
        return false;
    }

    if (!o.showBtn) {
        o.showBtn = this.$f.element.find(s.show);
    }

    if (!o.hideBtn) {
        o.hideBtn = o.container.find(s.hide);
    }

    if (!o.captureBtn) {
        o.captureBtn = o.container.find(s.capture);
    }

    if (!o.preview) {
        o.preview = o.container.find(s.preview);
    }

    o.captureBtn.prop('disabled', true);
}

/**
 * Initialize event handlers.
 */
Camera.prototype._initHandlers = function () {
    const o = this.options;

    this.on(o.showBtn, 'click', this.show);
    this.on(o.hideBtn, 'click', this.hide);
    this.on(o.captureBtn, 'click', this.capture);

    if (this.isModal()) {
        o.container.on('shown.bs.modal', () => this.startStream())
                    .on('hidden.bs.modal', () => this.hide());
    }
}

/**
 * Show camera container / modal.
 */
Camera.prototype.show = function (e) {
    if (!this.mediaDevices) {
        return this.trigger('camerafallback', e, this.$f.trans('cameraFallback'));
    }

    if (this.isModal()) {
        this.options.container.modal('show');
    } else {
        this.options.container.show();
        this.startStream();
    }
}

/**
 * Hide camera container / modal.
 */
Camera.prototype.hide = function () {
    if (this.isModal()) {
        this.options.container.modal('hide');
    } else {
        this.options.container.hide();
    }

    this.stopStream();
}

/**
 * Capture image.
 */
Camera.prototype.capture = function (e) {
    const data = {files: [this.getBlob()], autoUpload: true};

    this.trigger('cameracapture', e, data);
}

/**
 * Start camera video stream.
 */
Camera.prototype.startStream = function () {
    this.video = $('<video autoplay></video>');
    this.options.preview.html(this.video).show();

    this.mediaDevices.getUserMedia({
        audio: false,
        video: this.options.constraints
    })
    .then((stream) => this.trigger('camerasuccess', null, stream))
    .catch((error) => this.trigger('cameraerror', null, error));
}

/**
 * Stop camera video stream.
 */
Camera.prototype.stopStream = function () {
    if (this.stream) {
        if (this.stream.getVideoTracks) {
            const tracks = this.stream.getVideoTracks();

            if (tracks && tracks[0] && tracks[0].stop) {
                tracks[0].stop();
            }
        } else if (this.stream.stop) {
            this.stream.stop();
        }

        delete this.stream;
    }

    if (this.video) {
        this.video.remove();
        delete this.video;
    }
}

/**
 * Flip camera preview horizontal.
 */
Camera.prototype.flipHorizontal = function () {
    this.options.preview.css({
        transform: 'scaleX(-1)',
        mozTransform: 'scaleX(-1)',
        webkitTransform : 'scaleX(-1)'
    });
}

/**
 * Get Blob object from video stream.
 *
 * @return {Blob}
 */
Camera.prototype.getBlob = function () {
    const dataUri = this._getDataUri();
    const base64 = dataUri.split('data:image/jpeg;base64,')[1];
    const binary = this._encode(base64);
    const blob = new Blob([binary], {type: 'image/jpeg'});

    blob.name = 'camera'+ Math.round(Math.random() * 1000) +'.jpg';
    blob.lastModifiedDate = new Date();

    return blob;
}

/**
 * Get video data url.
 *
 * @return {String}
 */
Camera.prototype._getDataUri = function () {
    const canvas = document.createElement('canvas');

    canvas.width = this.video[0].videoWidth;
    canvas.height = this.video[0].videoHeight;

    const context = canvas.getContext('2d');

    if (this.options.flipHorizontal) {
        context.translate(this.video[0].videoWidth, 0);
        context.scale(-1, 1);
    }

    context.drawImage(this.video[0], 0, 0);

    return canvas.toDataURL('image/jpeg');
}

/**
 * Detect Bootstrap modal support.
 *
 * @return {Boolean}
 */
Camera.prototype.isModal = function () {
    return this.options.container &&
        this.options.container.hasClass('modal');
}

/**
 * Get media devices.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 *
 * @return {MediaDevices|null}
 */
Camera.prototype._getMediaDevices = function () {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices;
    }

    return (navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
        getUserMedia (constraints) {
            return new Promise((resolve, reject) => {
                (navigator.mozGetUserMedia || navigator.webkitGetUserMedia)
                            .call(navigator, constraints, resolve, reject);
            });
        }
    } : null;
}

/**
 * Encode base64 string to array buffer.
 *
 * @param  {String}
 * @return {ArrayBuffer}
 */
Camera.prototype._encode = function (base64) {
    const bin = atob(base64);
    const len = bin.length;
    const ab = new ArrayBuffer(len);
    const ua = new Uint8Array(ab);

    for (let i = 0; i < len; i++) {
        ua[i] = bin.charCodeAt(i);
    }

    return ab;
}

/**
 * Register the plugin.
 */
Filepicker.plugin('camera', Camera);
