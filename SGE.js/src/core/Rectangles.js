define(['./EventTarget', './Pools'], function (EventTarget, Pools) {

    'use strict';

    function Rectangle(width, height, x, y) {
        EventTarget.call(this);

        x = x != null ? x : 0;
        y = y != null ? y : 0;
        width = width != null ? width : 0;
        height = height != null ? height : 0;

        Object.defineProperties(this, {

            width: {
                value: width,
                configurable: true
            },

            height: {
                value: height,
                configurable: true
            },

            x: {
                value: x,
                configurable: true
            },

            y: {
                value: y,
                configurable: true
            }            
        });
    }

    Rectangle.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(Rectangle.prototype, {
        constructor: { value: Rectangle }        
    });
        
    var releasedEvent = 'released';

    function PooledRectangle(pool) {        
        var released = false;
        Object.defineProperties(this, {
            release: {
                value: function () {
                    if (released)
                        return;
                    released = true;
                    this.trigger(releasedEvent);
                    pool.release(this);
                },
                configurable: true
            }
        });
    }

    var viewPortPool;
    
    function ViewPort(width, height, x, y) {
        Rectangle.call(this, width, height, x, y);
        PooledRectangle.call(this, viewPortPool);
    }

    ViewPort.prototype = Object.create(Rectangle.prototype);
    Object.defineProperty(ViewPort.prototype, 'constructor', { value: ViewPort });

    viewPortPool = Pools.createObjectPool(ViewPort, false);

    var scissorPool;
    
    function Scissor(width, height, x, y) {
        Rectangle.call(this, width, height, x, y);
        PooledRectangle.call(this, scissorPool);
    }

    Scissor.prototype = Object.create(Rectangle.prototype);
    Object.defineProperty(Scissor.prototype, 'constructor', { value: Scissor });
        
    scissorPool = Pools.createObjectPool(Scissor, false);

    var module = Object.freeze({

        createViewPort: function (width, height, x, y) {
            return viewPortPool.get(width, height, x, y);
        },

        createScissor: function (width, height, x, y) {
            return scissorPool.get(width, height, x, y);
        }

    });

    Object.defineProperty(ViewPort.prototype, 'clone', {
        value: function () {
            return module.createViewPort(this.width, this.height, this.x, this.y);
        }
    });

    Object.defineProperty(Scissor.prototype, 'clone', {
        value: function () {
            return module.createScissor(this.width, this.height, this.x, this.y);
        }
    });

    return module;
});