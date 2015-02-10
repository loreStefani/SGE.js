define(['core/IDObject', 'Utils'],function (IDObject, Utils) {

    'use strict';

    function AnimationClip(loop, duration) {

        IDObject.call(this);

        var curves = [];
        var loop = loop != null ? loop : true;

        if (duration != null)
            //convert duration to ms
            duration *= 1000.0;

        Object.defineProperties(this, {

            duration: {
                get: function () {
                    return duration;
                }
            },

            setDurationFromCurves : {
                value: function () {
                    var curvesCount = this.curvesCount;
                    duration = 0.0;
                    for (var i = 0 ; i < curvesCount; i++)
                        duration = Math.max(duration, this.getCurveDesc(i).curve.duration);
                }
            },

            loop: {
                get: function () {
                    return loop;
                },
                set: function (v) {
                    loop = v;
                }
            },

            addCurve: {
                value: function (getTargetFun, property, curve) {
                    return curves.push({
                            getTargetFun: getTargetFun,
                            property: property,                        
                            curve: curve
                        }) - 1;
                }
            },

            getCurveDesc: {
                value: function (i) {
                    return curves[i];
                }
            },

            curvesCount: {
                get: function () {
                    return curves.length;
                }
            },

            removeCurve: {
                value: function (i) {
                    curves.splice(i, 1);
                }
            },

            removeCurves: {
                value: function () {
                    Utils.emptyArray(curves);
                }
            }

        });
    }

    AnimationClip.prototype = Object.create(IDObject.prototype);
    Object.defineProperty(AnimationClip.prototype, 'constructor', { value: AnimationClip });

    return AnimationClip;
});