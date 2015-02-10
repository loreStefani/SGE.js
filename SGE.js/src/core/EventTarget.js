define(['./IDObject', './Pools'], function (IDObject, Pools) {

    'use strict';

    function EventTarget() {

        IDObject.call(this);

        var listeners = {};        

        Object.defineProperties(this, {

            addEventListener: {
                value: function (event, listener) {
                    var eventListeners = listeners[event];
                    if (eventListeners == null) {
                        eventListeners = [];
                        listeners[event] = eventListeners;
                    }
                    return eventListeners.push(listener) - 1;
                },
                configurable : true
            },

            removeEventListener: {
                value: function (event, listener) {
                    var eventListeners = listeners[event];
                    if (eventListeners == null)
                        return;

                    var i;
                    while ((i = eventListeners.indexOf(listener)) != -1)
                        eventListeners.splice(i, 1);                    
                },
                configurable: true
            },

            trigger: {
                value: function (event, arg) {
                    var eventListeners = listeners[event];
                    if (eventListeners == null)
                        return;

                    var count = eventListeners.length;
                    if (count == 0)
                        return;

                    //this is necessary when a listener remove itself or other listeners of the same event
                    var toFire = Pools.ArrayPool.get();
                    for (var i = 0; i < count ; i++)
                        toFire[i] = eventListeners[i];

                    for (var i = 0; i < count ; i++)
                        toFire[i](arg);
                    Pools.ArrayPool.release(toFire);
                },
                configurable: true
            }
        });
    }

    EventTarget.prototype = Object.create(IDObject.prototype);
    Object.defineProperty(EventTarget.prototype, 'constructor', { value: EventTarget });

    return EventTarget;
});