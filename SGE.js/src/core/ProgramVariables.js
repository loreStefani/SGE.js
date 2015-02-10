define(['./EventTarget', './Pools'], function (EventTarget, Pools) {

    'use strict';

    var ProgramVariableType = Object.freeze({
        ProgramVariable: 0,
        ProgramVariableStruct: 1,
        ProgramVariableArray: 2
    });

    var releasedEvent = 'released';

    function SimplePooled(pool) {        
        Object.defineProperties(this, {
            release: {
                value: function () {                    
                    this.trigger(releasedEvent);
                    //this deletes all the properties, see pool construction
                    pool.release(this);
                },
                configurable : true
            }
        });
    }
    
    var dirtyEvent = 'dirty';

    var programVariablePool;
    
    function ProgramVariable(name) {

        EventTarget.call(this);
        SimplePooled.call(this, programVariablePool);

        var value = null;

        Object.defineProperties(this, {

            name: {
                value: name,
                configurable : true
            },

            value: {
                set: function (v) {
                    value = v;
                    this.trigger(dirtyEvent);                    
                },
                get: function () {
                    return value;
                },
                configurable : true
            }
        });
    }
                
    ProgramVariable.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(ProgramVariable.prototype, {
        constructor: { value: ProgramVariable },
        type: {
            value : ProgramVariableType.ProgramVariable
        }        
    });

    programVariablePool = Pools.createObjectPool(ProgramVariable);
    

    var programVariableStructPool;
    
    function ProgramVariableStruct(name, fields) {
        
        //it doesn't hold a value (i.e. it is not settable ), so it's not a ProgramVariable
        EventTarget.call(this);
        SimplePooled.call(this, programVariableStructPool);

        (function () {

            var properties = {
                name: {
                    value: name,
                    configurable : true
                }
            };

            for (var key in fields)
                properties[key] = {
                    get: (function () {

                        var field = fields[key];
                        return function () {
                            return field;
                        };

                    })(),
                    configurable: true
                };

            Object.defineProperties(this, properties);

        }).call(this);
    }

    ProgramVariableStruct.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(ProgramVariableStruct.prototype, {
        constructor: { value: ProgramVariableStruct },
        type: {
            value : ProgramVariableType.ProgramVariableStruct
        }
    });
    
    programVariableStructPool = Pools.createObjectPool(ProgramVariableStruct);

    var programVariableArrayPool;
    
    function ProgramVariableArray(name, elements) {

        ProgramVariable.call(this, name);
        SimplePooled.call(this, programVariableArrayPool);
            
        (function () {
                
            var properties = {};

            var elementCount = elements.length;
                
            for (var i = 0; i < elementCount; i++)
                properties[i] = {
                    get: (function () {

                        var element = elements[i];
                        return function () {
                            return element;
                        };

                    })(),
                    configurable: true
                };

            properties.length = {
                value: elementCount,
                configurable: true
            };

            Object.defineProperties(this, properties);

        }).call(this);            
    }

    ProgramVariableArray.prototype = Object.create(ProgramVariable.prototype);
    Object.defineProperties(ProgramVariableArray.prototype, {
        constructor: { value: ProgramVariableArray },
        type: {
            value : ProgramVariableType.ProgramVariableArray
        }
    });

    programVariableArrayPool = Pools.createObjectPool(ProgramVariableArray);

    return Object.freeze({
        ProgramVariableType: ProgramVariableType,

        createProgramVariable: function (name) {
            return programVariablePool.get(name);
        },

        createProgramVariableStruct: function (name, fields) {
            return programVariableStructPool.get(name, fields);
        },

        createProgramVariableArray: function (name, elements) {
            return programVariableArrayPool.get(name, elements);
        }
    });

});