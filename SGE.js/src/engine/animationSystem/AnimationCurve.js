define(['core/IDObject', 'Utils', './Interpolators'], function (IDObject, Utils, Interpolators) {
    
    'use strict';

    function AnimationCurve(valuesCtor) {

        IDObject.call(this);

        Object.defineProperties(this, {

            getValue: {
                value: function (timePos) {
                },
                configurable: true
            },

            duration: {
                value: 0.0,
                configurable : true
            },

            valuesCtor: {
                value : valuesCtor
            }
        });
    }

    AnimationCurve.prototype = Object.create(IDObject.prototype);
    Object.defineProperty(AnimationCurve.prototype, 'constructor', { value: AnimationCurve });
    
    function KeyFrameAnimation(valuesCtor, interpolationType) {

        AnimationCurve.call(this, valuesCtor);

        if (interpolationType == null)
            interpolationType = Interpolators.InterpolationType.LINEAR;

        var interpolator = Interpolators.get(valuesCtor, interpolationType);
        var tempValue = new valuesCtor();

        var values = [];
        var timePositions = [];

        Object.defineProperties(this, {
                        
            keysCount: {
                get: function () {
                    return values.length;
                }
            },

            duration : {
                get: function () {
                    var keysCount = this.keysCount;
                    if (keysCount == 0)
                        return 0.0;
                    return timePositions[keysCount - 1];
                }
            },

            addKey: {
                value: function (value, timePos) {
                    values.push(value);
                    //convert timePos to ms
                    timePositions.push(timePos*1000.0);
                }
            },

            removeKey: {
                value: function (i) {
                    var keysCount = this.keysCount;
                    if (i < 0 || i > keysCount)
                        return;
                    values.splice(i, 1);
                    timePositions.splice(i, 1);
                }
            },

            removeKeys : {
                value: function () {
                    Utils.emptyArray(values);
                    Utils.emptyArray(timePositions);
                }
            },

            getValue: {
                value: function (timePos) {
                                        
                    var keysCount = this.keysCount;

                    if (keysCount == 0)
                        return null;

                    //handle time positions outside the timeline
                    if (timePos <= timePositions[0])
                        return values[0];
                    else if (timePos >= timePositions[keysCount - 1])
                        return values[keysCount - 1];

                    //find keys which timePos falls in between                    
                    var index1;
                                        
                    for (index1 = 0; index1 < keysCount - 1 ; index1++) 
                        if (timePos >= timePositions[index1] && timePos <= timePositions[index1 + 1]) 
                            break;
                                        
                    var index2 = index1 + 1;
                    var value1 = values[index1];
                    var value2 = values[index2];
                    var timePos1 = timePositions[index1];
                    var timePos2 = timePositions[index2];

                    //interpolate between keys
                    var alpha = (timePos - timePos1) / (timePos2 - timePos1);
                    return interpolator(value1, value2, alpha, tempValue);
                }
            }
        });
    }
    
    KeyFrameAnimation.prototype = Object.create(AnimationCurve.prototype);
    Object.defineProperty(KeyFrameAnimation.prototype, 'constructor', { value: KeyFrameAnimation });

    return Object.freeze({
        AnimationCurve: AnimationCurve,                
        KeyFrameAnimation: KeyFrameAnimation         
    });
});