define(['core/DataType'],function (DataType) {

    'use strict';

    function getSizeByType(type) {

        switch (type) {
            case DataType.BYTE:
                return Int8Array.BYTES_PER_ELEMENT;
            case DataType.SHORT:
                return Int16Array.BYTES_PER_ELEMENT;
            case DataType.UNSIGNED_BYTE:
                return Uint8Array.BYTES_PER_ELEMENT;
            case DataType.UNSIGNED_SHORT:
                return Uint16Array.BYTES_PER_ELEMENT;
            case DataType.FLOAT:
                return Float32Array.BYTES_PER_ELEMENT;
            default:
                throw new Error('invalid type');
        }
    }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    var degToRadian = (function () {
        var toRad = Math.PI / 180.0;
        return function (deg) {
            return deg * toRad;
        };
    })();

    var radianToDeg = (function () {
        var toDeg = 180.0 / Math.PI;
        return function (rad) {
            return rad * toDeg;
        };
    })();

    function emptyArray(obj) {
        for (var i = 0, count = obj.length; i < count; i++)
            obj.pop();
    }

    function nullifyObjectKeys(obj) {
        for (var key in obj)
            obj[key] = null;
    }

    function resizeArray(obj, length) {
        while (obj.length > length)
          obj.pop();        
    }

    function nullifyArrayElements(obj, startIndex) {
        var count = obj.length;
        for (var i = startIndex; i < count; i++)
            obj[i] = null;
    }

    function nopFunction() {        
    }
        
    var littleEndianess = (function () {
        var buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, 256, true);
        return new Int16Array(buffer)[0] === 256;
    })();

    function SortedArray() {

        var elements = [];

        Object.defineProperties(this, {

            get: {
                value: function (i) {
                    return elements[i];
                }
            },

            length: {
                get: function () {
                    return elements.length;
                }
            },

            insert: {
                value: function (v) {
                    var length = this.length;                    
                    var i = 0;
                    for (i = 0 ; i < length; i++) {
                        var el = elements[i];
                        if (v < el)
                            break;
                    }
                    elements.splice(i, 0, v);
                    return i;
                }
            },

            remove: {
                value: function (v) {
                    var index = this.indexOf(v);
                    if(index != -1)
                        elements.splice(index, 1);
                    return index;
                }
            },

            indexOf: {
                value: function (v) {

                    var firstIndex = 0;
                    var lastIndex = this.length - 1;
                    
                    while (firstIndex <= lastIndex) {
                        var middle = Math.floor((firstIndex + lastIndex) / 2);

                        var el = elements[middle];
                        var res = v - el;
                        if (res < 0)
                            lastIndex = middle - 1;
                        else if (res > 0)
                            firstIndex = middle + 1;
                        else
                            return middle;
                    }

                    return -1;
                }
            }
        });
    }

    SortedArray.prototype = {};
    Object.defineProperties(SortedArray.prototype, {

        constructor: {
            value: SortedArray
        }
        
    }); 
    
    return Object.freeze({
        getSizeByType: getSizeByType,
        littleEndianess: littleEndianess,
        getRandomArbitrary: getRandomArbitrary,
        getRandomInt: getRandomInt,
        degToRadian: degToRadian,
        radianToDeg : radianToDeg,
        emptyArray: emptyArray,
        nullifyObjectKeys: nullifyObjectKeys,
        resizeArray: resizeArray,
        nullifyArrayElements: nullifyArrayElements,
        nopFunction: nopFunction,
        SortedArray : SortedArray
    });

});