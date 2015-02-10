define(function () {
    
    'use strict';

    function System() {
    }

    System.prototype = {};
    Object.defineProperties(System.prototype, {

        constructor: { value: System },

        setScene : {
            value : function(scene){
            }
        },
                
        addComponent: {
            value: function (component) {
            }
        },

        removeComponent: {
            value: function (component) {
            }
        },

        update: {
            value: function (dt) {
            }
        }

    });

    return System;
});