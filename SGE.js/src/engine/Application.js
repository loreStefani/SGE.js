define(function () {

    'use strict';

    function Application() {
    }

    Application.prototype = {};
    Object.defineProperties(Application.prototype, {

        constructor : {value : Application},

        /**
        * requests files loading, loadRequests has the following array attributes :
        * 1) images : image files names
        * 2) textFiles : text files names
        */
        onLoadResources: {
            value: function (loadRequests) {               
            },
            configurable : true
        },

        /**
        * processes files requested with onLoadResources(), once they are all loaded
        */
        onResourceLoaded : {
            value: function (loadedImages, loadedTextFiles) {
            },
            configurable : true
        },

        /**
        * initializes the scene
        */
        createScene : {
            value: function (scene) {                
            },
            configurable : true
        },

        /**
        * application behavior when the engine is initialized and starts the application
        */
        onStart : {
            value: function () {
            },
            configurable : true
        },

        /**
        * application behavior when the engine is paused
        */
        onPause : {
            value: function () {
            },
            configurable : true
        },

        /**
        * application behavior when the engine is stopped, if error is not 
        * null an error occured
        */
        onStop : {
            value: function (error) {
            },
            configurable : true
        },

        /**
        * application behavior when the engine canvas is resized
        */
        onResize: {
            value: function (width, height) {
            },
            configurable : true
        }
    });

    return Application;
});