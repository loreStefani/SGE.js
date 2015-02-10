define(['./EventTarget', './Pools'], function (EventTarget, Pools) {

    'use strict';
    
    var ShaderType = Object.freeze({
        VERTEX_SHADER: 0,
        FRAGMENT_SHADER: 1
    });

    var releasedEvent = 'released';

    function Shader(type, source) {           

        EventTarget.call(this);

        var released = false;

        Object.defineProperties(this, {

            source: {
                value: source,
                configurable: true                    
            },

            type: {
                value: type,
                configurable: true                    
            },

            release: {
                value: function () {
                    if (released)
                        return;
                    released = true;
                    this.trigger(releasedEvent);
                    source = null;                    
                    shaderPool.release(this);                        
                },
                configurable : true
            }
        });
    }

    Shader.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(Shader.prototype, {

        constructor: { value: Shader },

        clone: {
            value: function () {
                return shaderPool.get(this.type, this.source);
            }
        }        
    });

    function Program(vertexShader, fragmentShader) {

        EventTarget.call(this);

        var released = false;

        Object.defineProperties(this,{

            vertexShader: {
                value: vertexShader,
                configurable : true
            },

            fragmentShader: {
                value: fragmentShader,
                configurable : true
            },

            release: {
                value: function () {
                    if (released)
                        return;
                    released = true;
                    this.trigger(releasedEvent);
                    vertexShader = null;
                    fragmentShader = null;                    
                    programPool.release(this);
                },
                configurable : true
            }
        });
    }

    Program.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(Program.prototype, {

        constructor: { value: Program },

        clone: {
            value: function () {
                return programPool.get(this.vertexShader, this.fragmentShader);
            }
        }            
    });

    var shaderPool = Pools.createObjectPool(Shader, false);
    var programPool = Pools.createObjectPool(Program, false);

    return Object.freeze({

        ShaderType: ShaderType,

        createShader: function (type, source) {
            return shaderPool.get(type, source);
        },

        createProgram: function (vertexShader, fragmentShader) {
            return programPool.get(vertexShader, fragmentShader);
        }
    });
});

    
    


