define(function () {

    'use strict';

    var nextID = 0;

    function IDObject() {

        var ID = nextID++;

        Object.defineProperty(this, 'ID', {value: ID, configurable : true});
    }

    IDObject.prototype = {};
    Object.defineProperties(IDObject.prototype, {

        constructor: { value: IDObject },

        //useful for sorting
        valueOf: {
            value: function () {
                return this.ID;
            }
        }

    });
    
    return IDObject;
});