define(['core/VMath', 'engine/TransformComponent', 'engine/Object3D', './AnimationClip', './AnimationCurve', './Interpolators'],

    function (VMath, TransformComponent, Object3D, AnimationClip, AnimationCurve, Interpolators) {
        
        'use strict';
        
        function Bone(boneTransform, finalTransform, finalInvTranspose) {
        
            TransformComponent.call(this);
        
            this.position = boneTransform.position;
            this.quaternion = boneTransform.quaternion;

            var finalTransformNeedsUpdate = false;
            var finalInvTransposeNeedsUpdate = false;
            //skeleton space to bone space transform in the bind pose of the skeleton
            var offsetMatrix = new VMath.Matrix4();

            function onTransformChanged() {            
                finalTransformNeedsUpdate = true;
                finalInvTransposeNeedsUpdate = true;
            }

            this.addEventListener('transformChanged', onTransformChanged);
        
            Object.defineProperties(this, {
                        
                offsetMatrix: {
                    get: function () {
                        return offsetMatrix;
                    },

                    set: function (v) {
                        if(v!= offsetMatrix)
                            offsetMatrix.fromMat4(v);
                        onTransformChanged();
                    }
                },

                finalTransform: {
                    get: function () {
                        if (finalTransformNeedsUpdate) {

                            /*
                            * because the root bone has a null parent, worldTransform corresponds to a 
                            * bone space to skeleton space transform in the actual pose of the skeleton
                            */
                            finalTransform.fromMat4(this.worldTransform);

                            //vertices positions are defined in skeleton space (in the bind pose of the skeleton)             
                            finalTransform.multiply(offsetMatrix);
                            finalTransformNeedsUpdate = false;
                        }                        
                        return finalTransform;
                    }
                },

                finalInvTranspose: {
                    get: function () {
                        if (finalInvTransposeNeedsUpdate) {
                            finalInvTranspose.fromMat4(this.finalTransform);
                            if (!this.hasUniformScale())
                                finalInvTranspose.invert().transpose();
                            finalInvTransposeNeedsUpdate = false;
                        }
                    
                        return finalInvTranspose;
                    }
                }
            });
        }

        Bone.prototype = {};
        Object.defineProperty(Bone.prototype, 'constructor', { value: Bone });

        function SkeletonData(bones) {

            var hierarchyIndices = [];
            //bones transforms in bone's parent space in the bind pose of the skeleton
            var bonesTransforms = [];

            //load data if provided
            if (bones != null)

                (function () {
                    for (var i = 0, bonesCount = bones.length ; i < bonesCount; i++) {
                        var bone = bones[i];
                        hierarchyIndices.push(bone.parent);
                        var quat = bone.rotq;
                        quat = new VMath.Quaternion(quat[0], quat[1], quat[2], quat[3]);
                        var pos = bone.pos;
                        pos = new VMath.Vector3(pos[0], pos[1], pos[2]);
                        bonesTransforms.push({
                            position: pos,
                            quaternion: quat
                        });
                    }
                })();

            Object.defineProperties(this, {

                hierarchyIndices: {
                    value: hierarchyIndices
                },

                bonesTransforms: {
                    value: bonesTransforms
                }

            });
        }

        SkeletonData.prototype = {};
        Object.defineProperty(SkeletonData.prototype, 'constructor', { value: SkeletonData });
    
        function Skeleton(skeletonData) {

            var hierarchyIndices = skeletonData.hierarchyIndices;
            var bonesTransforms = skeletonData.bonesTransforms;

            var bonesCount = hierarchyIndices.length;
            var bones = new Array(bonesCount);
            var finalTransforms = new VMath.Matrix4Array(bonesCount);
            var finalInvTransposes = new VMath.Matrix3Array(bonesCount);

            var rootIndex;
            var parentIndex;

            for (var i = 0 ; i < bonesCount; i++) {
                parentIndex = hierarchyIndices[i];
                if (parentIndex == -1)
                    rootIndex = i;
                bones[i] = new Bone(bonesTransforms[i], finalTransforms.get(i), finalInvTransposes.get(i));
            }

            if (rootIndex == null)
                throw new Error('invalid argument');

            for (var i = 0 ; i < bonesCount; i++) {
                parentIndex = hierarchyIndices[i];
                if (parentIndex == -1)
                    continue;
                bones[parentIndex].addChild(bones[i]);
            }

            //release references
            hierarchyIndices = null;
            bonesTransforms = null;
            skeletonData = null;
                        
            //update offset matrices, i.e. define the bind pose of the skeleton            
            for (var i = 0 ; i < bonesCount; i++) 
                bones[i].offsetMatrix = bones[i].worldInvTransform;
                
            Object.defineProperties(this, {
            
                getBone : {
                    value: function (index) {                    
                        return bones[index];
                    }
                },

                bonesCount : {
                    get: function () {
                        return bonesCount;
                    }
                },

                getBonesTransforms: {
                    value: function (bonesIndices, out) {
                        var bonesIndicesCount = bonesIndices.length;
                        for (var i = 0; i < bonesIndicesCount; i++) {
                            var bone = bones[bonesIndices[i]];
                            out.get(i).fromMat4(bone.finalTransform);
                        }
                    }
                },

                getBonesInvTransposes : {
                    value: function (bonesIndices, out) {
                        var bonesIndicesCount = bonesIndices.length;
                        for (var i = 0 ; i < bonesIndicesCount; i++) {
                            var bone = bones[bonesIndices[i]];
                            out.get(i).fromMat3(bone.finalInvTranspose);
                        }
                    }
                },

                finalTransforms: {
                    get: function () {
                        return finalTransforms;
                    }
                },

                finalInvTransposes: {
                    get: function () {                    
                        return finalInvTransposes;
                    }
                }
            });
        }

        Skeleton.prototype = {};
        Object.defineProperty(Skeleton.prototype, 'constructor',  { value: Skeleton });

        var Component = Object3D.Component;
        var SkeletonComponentType = Object3D.ComponentType.Skeleton;

        //proxy to a skeleton allowing multiple Object3D instances to reference the same Skeleton instance
        function SkeletonComponent(skeleton) {
            Component.call(this);

            Object.defineProperties(this, {

                getBone : {
                    value: function (index) {
                        return skeleton.getBone(index);
                    }
                },
                        
                getBonesTransforms: {
                    value: function (bonesIndices, out) {
                        return skeleton.getBonesTransforms(bonesIndices, out);                        
                    }
                },

                getBonesInvTransposes: {
                    value: function (bonesIndices, out) {
                        return skeleton.getBonesInvTransposes(bonesIndices, out);
                    }
                }            
            });
        }

        SkeletonComponent.prototype = Object.create(Component.prototype);
        Object.defineProperties(SkeletonComponent.prototype, {
            constructor: { value: SkeletonComponent },
            componentType: {
                value: SkeletonComponentType
            }
        });
        
        function getBone(index) {
            return function () {
                return this.object3D.getComponent(SkeletonComponentType).getBone(index);
            };
        }

        function SkeletonAnimationsLoader(animations) {

            var animationClips = [];

            for (var i = 0, animationCount = animations.length; i < animationCount; i++) {
                var animation = animations[i];
                var animHierarchy = animation.hierarchy;
                                
                var animClip = new AnimationClip(true);

                //import for each bone a position, a quaternion and a scale curve for this clip
                for (var j = 0, hierarchyLen = animHierarchy.length; j < hierarchyLen; j++) {
                    
                    var positionAnimation = new AnimationCurve.KeyFrameAnimation(VMath.Vector3, Interpolators.InterpolationType.LINEAR);
                    var quaternionAnimation = new AnimationCurve.KeyFrameAnimation(VMath.Quaternion, Interpolators.InterpolationType.LINEAR);
                    var scaleAnimation = new AnimationCurve.KeyFrameAnimation(VMath.Vector3, Interpolators.InterpolationType.LINEAR);
                                        
                    var keys = animHierarchy[j].keys;
                    var minTime = Number.POSITIVE_INFINITY;
                    var keysCount = keys.length;
                    
                    for (var k = 0; k < keysCount; k++)
                        minTime = Math.min(minTime, keys[k].time);

                    if(minTime < 0.0)
                        minTime = -minTime;
                    else                    
                        minTime = 0.0;

                    for (var k = 0; k < keysCount; k++) {
                        var key = keys[k];
                        //ensure timelines start at t = 0
                        var time = (key.time + minTime);

                        var pos = key.pos;
                        pos = new VMath.Vector3(pos[0], pos[1], pos[2]);
                        positionAnimation.addKey(pos, time);

                        var quat = key.rot;
                        quat = new VMath.Quaternion(quat[0], quat[1], quat[2], quat[3]);
                        quaternionAnimation.addKey(quat, time);

                        var scale = key.scl;
                        scale = new VMath.Vector3(scale[0], scale[1], scale[2]);
                        scaleAnimation.addKey(scale, time);
                    }

                    var getBoneFun = getBone(animHierarchy[j].joint);
                    animClip.addCurve(getBoneFun, 'position', positionAnimation);
                    animClip.addCurve(getBoneFun, 'quaternion', quaternionAnimation);
                    animClip.addCurve(getBoneFun, 'scale', scaleAnimation);
                }

                animClip.setDurationFromCurves();
                animationClips.push(animClip);
            }

            return animationClips;
        }

        return Object.freeze({
            SkeletonData : SkeletonData,
            Skeleton: Skeleton,
            SkeletonComponent: SkeletonComponent,
            SkeletonAnimationsLoader: SkeletonAnimationsLoader
        });
    });