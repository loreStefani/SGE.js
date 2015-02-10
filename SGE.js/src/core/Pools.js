define(['./IDObject', 'Utils'],

    function (IDObject, Utils) {

        'use strict';
         
        function ObjectPool(ctor) {

            IDObject.call(this);
            
            var unlockedObjects = [];
            var unlockedSpans = [];
            var lastUpdateTime = Date.now();            
            var maxLifeTime = 60000;
            var updateSpan = maxLifeTime / 2;

            //support function that allows the use of apply with the new operator
            function constructor(args) {
                return ctor.apply(this, args);
            }
            constructor.prototype = ctor.prototype;

            Object.defineProperties(this, {

                get: {
                    value: function () {

                        var object = null;
                        
                        //check if there are available objects otherwise create a new object
                        if (unlockedObjects.length > 0) {                           
                            object = unlockedObjects.shift();                            
                            unlockedSpans.shift();
                            ctor.apply(object, arguments);                            
                        } else
                            object = new constructor(arguments);
                                                
                        return object;
                    }
                },

                release: {
                    value: function (object) {                        
                        this.cleanObject(object);                    
                        unlockedObjects.push(object);
                        unlockedSpans.push(Date.now());
                    }
                },

                update: {
                    value: function (now) {

                        if (now - lastUpdateTime < updateSpan)
                            return;

                        lastUpdateTime = now;

                        var count = unlockedObjects.length;

                        if (count == 0)
                            return;

                        var removeCount = 0;
                                    
                        for (var i = 0 ; i < count; i++)                                                             
                            if (now - unlockedSpans[i] < maxLifeTime )
                                /*
                                * older objects are placed at the beginning, checking can be interrupted 
                                * as soon as an object that doesn't expire is found 
                                */
                                break;
                            else
                                removeCount++;
                        
                        if (removeCount == 0)
                            return;

                        unlockedObjects.splice(0, removeCount);
                        unlockedSpans.splice(0, removeCount);
                    }                    
                },

                maxLifeTime: {
                    get: function () {
                        return maxLifeTime;
                    },
                    set: function (v) {
                        maxLifeTime = v;
                    }
                },

                updateSpan: {
                    get: function () {
                        return updateSpan;
                    },
                    set: function (v) {
                        updateSpan = v;
                    }
                }
            });
        }
        
        ObjectPool.prototype = Object.create(IDObject.prototype);
        Object.defineProperties(ObjectPool.prototype, {

            cleanObject: {
                value: function (object) {
                    for (var key in object)
                        delete object[key];
                }
            }        
        });

        function ArrayPool() {
            ObjectPool.call(this, Array);
        }

        ArrayPool.prototype = Object.create(ObjectPool.prototype);
        Object.defineProperties(ArrayPool.prototype, {

            cleanObject: {
                value: Utils.emptyArray
            }
        });
                
        var poolInstances = {};

        function createInstance(pool) {
            poolInstances[pool.ID] = pool;
        }

        function releaseInstance(pool) {
            var poolID = pool.ID;
            if (poolID in poolInstances)
                delete poolInstances[poolID]; //this avoids the != null check in the update function            
        }

        function update(dt) {
            var now = Date.now();
            for (var key in poolInstances) 
                poolInstances[key].update(now);
        }

        var module ={

            createObjectPool: function (ctor, performClean) {

                if (ctor == null)
                    ctor = Object;

                var pool = new ObjectPool(ctor);

                if (performClean === false)
                    Object.defineProperty(pool, 'cleanObject', { value: Utils.nopFunction });

                createInstance(pool);

                return pool;
            },

            createArrayPool: function () {
                var pool = new ArrayPool();
                createInstance(pool);
                return pool;
            },

            releasePool: releaseInstance,
            update: update
        };
        
        //create global pools
        Object.defineProperties(module, {
            ObjectPool: {
                value : module.createObjectPool()
            },
            ArrayPool: {
                value: module.createArrayPool()
            }
        });

        return Object.freeze(module);

    });

