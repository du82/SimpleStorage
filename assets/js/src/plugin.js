import $ from 'jquery';

export default function (Filepicker) {
    /**
     * jQuery plugin definition.
     *
     * @param  {Object} options
     * @return {Object}
     */
    $.fn[Filepicker.pluginName] = function (options = {}) {
        const el = $(this);
        const instance = el.data(Filepicker.pluginName);

        if (instance) {
            return instance;
        }

        return this.each(function () {
            options.el = $(this);
            options.el.data(Filepicker.pluginName, new Filepicker(options));
        });
    }
}
