define(['./renderSystem/RenderSystem', 'core/Device', './animationSystem/AnimationSystem', './behaviorSystem/BehaviorSystem', './Scene', 'loaders/ResourceLoader',
    'loaders/ImageLoader', 'loaders/TextfileLoader', 'core/Pools', 'libs/jquery', 'libs/Stats'],

    function (RenderSystem, Device, AnimationSystem, BehaviorSystem, Scene, ResourceLoader, ImageLoader, TextFileLoader, Pools, $, Stats) {

        'use strict';

        function Engine(parameters) {
                
            var parent = parameters.parent;
            if (parent == null)
                parent = 'body';
            var container = $('<div>', { id: 'sge_container' }).css({ width: '100%', height: '100%', margin: 0, padding: 0, left: '0px', top: '0px' });
            var stats = null;
            if (parameters.stats) {
                stats = new Stats();
                container.append($(stats.domElement).css({  position: 'absolute', top: '0px', left : '0px' }));
            }
            
            var dev;
            var animationSystem;
            var renderer;
            var behaviorSystem;
            var systems;
            var currScene;
            
            var application;

            var reqId;
            var lastTime;

            var bootStrapFun = function (timeStamp) {
                init();
                lastTime = timeStamp;
                reqId = requestAnimationFrame(mainLoop);                
                $(parent).append(container);                
                stopListeners.push(function () {
                    $(container).remove();                    
                });
            };
            
            var mainLoop = function(timeStamp) {
                var dt = timeStamp - lastTime;
                lastTime = timeStamp;
                Pools.update(dt);
                behaviorSystem.update(dt);
                animationSystem.update(dt);
                renderer.update(dt);                
                reqId =  requestAnimationFrame(mainLoop);
            };

            if (stats != null) {               
                mainLoop = (function () {
                    var l = mainLoop;
                    return function (timeStamp) {
                        stats.begin();
                        l(timeStamp);
                        stats.end();
                    };                    
                })();
            }

            var stopListeners = [];
            var running = true;
            var paused = false;

            var pauseTime;

            function pause() {
                if (running) {
                    paused = true;
                    cancelAnimationFrame(reqId);
                    application.onPause();
                    pauseTime = performance.now();
                }
            }
            
            function resume() {                
                if (running && paused) {
                    paused = false;
                    reqId = requestAnimationFrame(mainLoop);
                    application.onStart();
                    lastTime += performance.now() - pauseTime;
                }
            }

            function stop(error) {
                if (!running)
                    return;
                if (!paused) 
                    cancelAnimationFrame(reqId);
                else
                    paused = false;
                running = false;
                application.onStop(error);
                var count = stopListeners.length;
                for (var i = count-1; i >= 0; i--)
                    stopListeners[i]();
                stopListeners = [];
            }

            function resize(width, height) {
                container.css({ width: width + 'px', height: height + 'px' });
                dev.resize(width, height);
                application.onResize(width, height);
            }
                                    
            function init() {
                
                currScene = new Scene(systems);
                stopListeners.push(function () {
                    currScene.release();
                    currScene = null;
                });

                application.createScene(currScene);

                dev.addEventListener('contextLost', pause);
                dev.addEventListener('contextRestored', resume);
                
                var stopListener;

                if (!parameters.customResize) {

                    var resizeListener = function () {
                        var width = window.innerWidth;
                        var height = window.innerHeight;
                        resize(width, height);
                    };

                    resizeListener();
                    $(window).resize(resizeListener);

                    stopListener = function () {
                        dev.removeEventListener('contextRestored', resume);
                        dev.removeEventListener('contextLost', pause);
                        $(window).off('resize', resizeListener);
                    };                    
                } else
                    stopListener = function () {
                        dev.removeEventListener('contextRestored', resume);
                        dev.removeEventListener('contextLost', pause);                        
                    };
                
                stopListeners.push(stopListener);

                application.onStart();
            }
            
            var run = function (app, parameters) {
                
                if (app == null)
                    throw new Error('invalid argument');
                if (parameters == null)
                    parameters = {};

                if (application != null)
                    stop();
                
                var canvas = parameters.canvas;
                if (canvas == null)
                    canvas = $('<canvas>', { id: 'sge_canvas' }).get(0);
                $(canvas).css({ width: '100%', height: '100%', margin: 0, padding: 0, left: '0px', top: '0px' });
                container.append(canvas);

                dev = new Device(canvas);
                animationSystem = new AnimationSystem(parameters);
                renderer = new RenderSystem(dev, parameters);
                behaviorSystem = new BehaviorSystem(parameters);
                systems = Object.freeze({ renderSystem: renderer, animationSystem: animationSystem, behaviorSystem: behaviorSystem });
                
                application = app;

                stopListeners.push(function () {
                    application = null;
                    $(container).empty();
                    dev = null;
                    animationSystem = null;
                    renderer = null;
                    behaviorSystem = null;
                    systems = null;
                });                
                
                if (!application.hasOwnProperty('onLoadResources')) {
                    requestAnimationFrame(bootStrapFun);
                    return;
                }
                
                var images = [];
                var textFiles = [];
                var loadRequests = {
                    images: images,
                    textFiles: textFiles
                };

                application.onLoadResources(loadRequests);

                var args = [];

                var loadImages = images.length > 0;
                var loadTextFiles = textFiles.length > 0;

                if (loadImages) {
                    var imageLoad = [];
                    imageLoad.push(images, ImageLoader);
                    args.push(imageLoad);
                }

                if (loadTextFiles) {
                    var textLoad = [];
                    textLoad.push(textFiles, TextFileLoader);
                    args.push(textLoad);
                }

                args.push(function () {
                    //arguments contains the loaded resources
                    application.onResourceLoaded.apply(application, arguments);
                    requestAnimationFrame(bootStrapFun);
                });

                ResourceLoader.load.apply(null, args);                                     
            };
                        
            if (parameters.debug !== true) {
                bootStrapFun = makeTryCatch(bootStrapFun, stop);
                mainLoop = makeTryCatch(mainLoop, stop);
                run = makeTryCatch(run, stop);
            }
                           
            Object.defineProperties(this, {

                run: {
                    value: run
                },

                pause: {
                    value : pause
                },

                resume: {
                    value : resume
                },

                stop: {
                    value : stop
                },

                resize: {
                    value : resize
                },

                container: {
                    value : container.get(0)
                }
            });
        }   

        Engine.prototype = {};
        Object.defineProperty(Engine.prototype, 'constructor', { value: Engine });
    

        function makeTryCatch(f, onError) {            
            return function () {
                try {
                    f.apply(this, arguments);
                } catch (error) {
                    onError.call(this, error);
                }
            };
        }
        
        return Engine;

    }
);
