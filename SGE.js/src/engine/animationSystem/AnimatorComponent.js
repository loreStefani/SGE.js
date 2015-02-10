define(['engine/Object3D', './Interpolators', 'core/Pools', 'Utils'], function (Object3D, Interpolators, Pools, Utils) {

    var Component = Object3D.Component;
    var LinearInterpolationType = Interpolators.InterpolationType.LINEAR;

    function ClipDesc(name, clip, weight, perClipCurves, onPlayed) {
        this.name = name;
        this.loop = clip.loop;
        this.duration = clip.duration;
        this.curves = perClipCurves;
        this.onPlayed = onPlayed;
        this.weight = weight;
        this.normalizedWeight = 0.0;
        this.currTime = 0.0;
        this.playBackRate = 0.0;
        this.valueOf = (function () {
            var clipValueOf = clip.valueOf;
            return function () {
                return clipValueOf.apply(clip);
            };
        })();
        this.release = function () {
            var curvesCount = perClipCurves.length;
            for (var i = 0; i < curvesCount; i++)
                curveDescPool.release(perClipCurves[i]);
            clipDescPool.release(this);
        };
    }
    var clipDescPool = Pools.createObjectPool(ClipDesc, false);

    function CurveDesc(curve, target, type, property) {
        this.curve = curve;
        this.target = target;
        this.type = type;
        this.property = property;        
        this.interpolator = Interpolators.get(curve.valuesCtor, LinearInterpolationType);
    }
    var curveDescPool = Pools.createObjectPool(CurveDesc, false);

    function AnimatorComponent() {

        Component.call(this);

        var clips = {};
        var playingClips = new Utils.SortedArray();
        var playingMap = {};
        var currDuration = 0.0;
        var currWeightSum = 0.0;

        var crossFading = false;
        var crossTarget = null;
        var currCrossRemTime = 0.0;
        var crossLength = 0.0;
        var crossInitWeight = 0.0;
        var crossWeightChangedFun;
        function crossDtFun(u) {
            return (1.0 - u) * crossInitWeight + u; //target weight = 1.0           
        }
        
        function normalize() {

            currWeightSum = 0.0;
            currDuration = 0.0;

            var clipCount = playingClips.length;            
            var clipDesc;

            //shortcut
            if (clipCount == 1) {
                clipDesc = playingClips.get(0);
                clipDesc.normalizedWeight = 1.0;
                clipDesc.playBackRate = 1.0;
                currWeightSum = 1.0;                
                return;
            }
                        
            for (var i = 0; i < clipCount; i++)                
                currWeightSum += playingClips.get(i).weight;
            
            if (currWeightSum > 0.0) {

                for (var i = 0; i < clipCount; i++) {
                    clipDesc = playingClips.get(i);
                    var weight = clipDesc.weight / currWeightSum;
                    clipDesc.normalizedWeight = weight;
                    currDuration += weight * clipDesc.duration;
                }

                for (var i = 0; i < clipCount; i++) {
                    clipDesc = playingClips.get(i);
                    clipDesc.playBackRate = clipDesc.duration / currDuration;
                }                
                
            }else
                for (var i = 0; i < clipCount; i++) {
                    clipDesc = playingClips.get(i);
                    clipDesc.normalizedWeight = 0.0;
                    clipDesc.playBackRate = 0.0;
                }                
            
        }

        Object.defineProperties(this, {

            addClip: {
                value: function (name, clip) {
                    clips[name] = clip;
                }
            },

            removeClip : {
                value: function (name) {
                    this.stop(name);
                    clips[name] = null;                    
                }
            },

            removeClips : {
                value: function () {
                    for (var key in clips) 
                        this.removeClip(key);                    
                }
            },

            play: {
                value: function (name, weight, onPlayed) {

                    var clip = clips[name];
                                        
                    if (clip  == null)
                        return;

                    if (weight == null)
                        weight = 1.0;

                    //check if this clip is being played
                    var clipDesc = playingMap[name];
                    if (clipDesc == null) {
                        
                        var perClipCurves = [];
                        clipDesc = clipDescPool.get(name, clip, weight, perClipCurves, onPlayed);
                        
                        playingClips.insert(clipDesc);
                        playingMap[name] = clipDesc;
                                                
                        var curvesCount = clip.curvesCount;
                        for (var i = 0; i < curvesCount; i++) {
                            var curveDesc = clip.getCurveDesc(i);
                            var curve = curveDesc.curve;

                            //retrieve the target of this curve, ensure each curve has a valid target
                            var target = curveDesc.getTargetFun.apply(this);
                            if (target == null)
                                continue;

                            perClipCurves.push(curveDescPool.get(curve, target, curveDesc.type, curveDesc.property));
                        }

                    } else {
                        //just change weight and onPlayed if provided
                        clipDesc.weight = weight;
                        if (onPlayed != null)
                            clipDesc.onPlayed = onPlayed;                        
                    }

                    normalize();
                }
            },

            stop: {
                value: function (name) {
                    var clipDesc = playingMap[name];
                    if (clipDesc == null)
                        return;
                    playingMap[name] = null;                    
                    playingClips.remove(clipDesc);
                    clipDesc.release();
                    normalize();
                }
            },

            getNormalizedWeight : {
                value: function (name) {
                    var clipDesc = playingMap[name];
                    if (clipDesc == null)
                        return 0.0;
                    return clipDesc.normalizedWeight;
                }
            },

            stopAll : {
                value: function () {
                    for (var key in playingMap)
                        this.stop(key);
                }
            },

            crossFade: {
                value: function (name, length, onWeightChanged) {

                    if (clips[name] == null)
                        return;

                    //is the clip already being played ? 
                    var clipDesc = playingMap[name];
                    if (clipDesc != null) {
                        crossInitWeight = clipDesc.normalizedWeight;

                        /*
                        * check if the operation is actually needed, i.e. the clip is the only clip 
                        * that is being played
                        */
                        if (crossInitWeight == 1.0)
                            return;
                    }
                    else 
                        crossInitWeight = 0.0;
                    
                    //convert length to ms
                    crossLength = length * 1000.0;
                    currCrossRemTime = crossLength;
                    crossFading = true;
                    crossTarget = name;                    
                    crossWeightChangedFun = onWeightChanged;                                       
                    
                    this.play(name, crossInitWeight);
                }
            },

            update: {
                value: function (dt) {

                    var needNormalize = false;
                    var crossChangeCall = false;
                    var clipCount = playingClips.length;

                    if (crossFading) {

                        needNormalize = true;

                        var clipTarget = playingMap[crossTarget];
                        currCrossRemTime -= dt;

                        if (currCrossRemTime <= 0.0) {
                            crossFading = false;
                            var i = 0;
                            while (clipCount != 1) {
                                var clipDesc = playingClips.get(i);
                                if (clipDesc == clipTarget) {
                                    i++;
                                    continue;
                                }
                                playingClips.remove(clipDesc);
                                playingMap[clipDesc.name] = null;
                                clipDesc.release();
                                clipCount--;
                            }

                        } else {
                            var targetWeight = crossDtFun((crossLength - currCrossRemTime) / crossLength); 
                                                        
                            //distribute 1-weight among the others                            
                            var uniformWeight = (1.0 - targetWeight)/(currWeightSum - clipTarget.weight);
                            for (var i = 0; i < clipCount; i++) {
                                var clipDesc = playingClips.get(i);
                                if (clipDesc != clipTarget)
                                    clipDesc.weight = clipDesc.weight * uniformWeight;
                            }                            

                            clipTarget.weight = targetWeight;
                        }

                        crossChangeCall = true;                        
                    }

                    for (var i = 0 ; i < clipCount; i++) {

                        var clipDesc = playingClips.get(i);                        
                        var animTime = clipDesc.currTime + dt * clipDesc.playBackRate;

                        if (animTime >= clipDesc.duration) {
                            if (clipDesc.loop)
                                animTime = 0.0;
                            else {
                                playingClips.remove(clipDesc);
                                i--;
                                clipCount--;
                                playingMap[clipDesc.name] = null;
                                clipDesc.release();
                                var onPlayed = clipDesc.onPlayed;
                                if (onPlayed != null)
                                    onPlayed();
                                needNormalize = true;
                                continue;
                            }
                        }

                        clipDesc.currTime = animTime;

                        var weight = clipDesc.normalizedWeight;

                        if (weight == 0)
                            continue;

                        var curves = clipDesc.curves;
                        var curvesCount = curves.length;

                        for (var j = 0 ; j < curvesCount; j++) {
                            var curveDesc = curves[j];
                            var target = curveDesc.target;
                            var property = curveDesc.property;
                            var currValue = target[property];
                            var newValue = curveDesc.curve.getValue(animTime);
                            target[property] = curveDesc.interpolator(currValue, newValue, weight, currValue);
                        }
                    }

                    if (needNormalize)
                        normalize();

                    if (crossChangeCall && crossWeightChangedFun != null)
                        crossWeightChangedFun();
                }
            }
        });
    }


    AnimatorComponent.prototype = Object.create(Component.prototype);
    Object.defineProperties(AnimatorComponent.prototype, {
        constructor: { value: AnimatorComponent },

        componentType: {
            value: Object3D.ComponentType.Animator
        }
    });


    return AnimatorComponent;
});