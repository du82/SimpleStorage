import $ from 'jquery';

export default function (Filepicker) {
    /**
     * Add event listener on element or instance.
     *
     * I. First argument is instance of jQuery.
     *
     * @param {Object} jQuery element.
     * @param {String} Event type.
     * @param {String|Function} Selector or handler.
     * @param {Function|Object} Handler or object.
     * @param {Object}          Context object.
     *
     * II. First argument is string, an event type.
     *
     * @param {String}   jQuery element or event type.
     * @param {Function} Event handler.
     */
    Filepicker.prototype.on = function () {
        if (!arguments[0]) {
            return false;
        }

        if (arguments[0] instanceof $) {
            // Add event handler on the element.

            let element = arguments[0];
            let type = arguments[1];
            let selector = arguments[2];
            let handler = arguments[3];
            let context = arguments[4];

            // Shift arguments if selector is missing.
            if ($.isFunction(selector)) {
                context = handler;
                handler = selector;
                selector = null;
            }

            element.on(type, selector, $.proxy(handler, context || this));
        } else {
            // Add event handler the instance.

            let type = arguments[0];
            let handler = arguments[1];

            (this.events[type] = this.events[type] || []).push(handler);
        }
    }

    /**
     * Remove an event handler from element and instance.
     *
     * @param {String}   type
     * @param {Function} handler
     */
    Filepicker.prototype.off = function (type, handler) {
        if (this.element) {
            this.element.off(type, handler);
        }

        type || (this.events = {});

        let list = this.events[type] || [];
        let i = list.length = handler ? list.length : 0;

        while (i--) {
            handler == list[i] && list.splice(i, 1);
        }
    }

    /**
     * Trigger an event on the element and instance.
     *
     * @param  {String} type
     * @param  {Object} event
     * @param  {Object} data
     * @param  {Object} context
     * @return {Boolean}
     */
    Filepicker.prototype.trigger = function (type, event, data = {}, context) {
        event = $.Event(event);
        event.type = type + '.' + Filepicker.namespace;

        context = context || this;

        if (this.element) {
            event.target = this.element[0];
        }

        copyProps(event);

        // Trigger event on the element.
        if (this.element) {
            this.element.trigger(event, data);
        }

        // Trigger event on the instance.
        this._emit.apply(this, [type, context, event].concat(data));

        // Trigger event on default handler.
        const response = $.isFunction(this.options[type]) &&
                this.options[type].apply(context, [event].concat(data)) === false;

        return !(response || event.isDefaultPrevented());
    }

    /**
     * Trigger an event event on instance.
     *
     * @param {String} type
     * @param {Object} context
     */
    Filepicker.prototype._emit = function (type, context) {
        let list = this.events[type] || [], i = 0, handler;

        while ((handler = list[i++])) {
            handler.apply(context || this, [].slice.call(arguments, 2));
        }
    }

    /**
     * Copy original event props.
     *
     * @param {Object} event
     */
    function copyProps (event) {
        const orig = event.originalEvent;

        if (orig) {
            for (let prop in orig) {
                if (!(prop in event)) {
                    event[prop] = orig[prop];
                }
            }
        }
    }
}
