define(['Utils'], function (Utils) {

    'use strict';

    function GlobalVariable() {
        
        var variables = [];
        this.variables = variables;
        this.addVariable = function (programVariable) {
            variables.push(programVariable);
            programVariable.global = this;
        };

        this.removeVariable = function (programVariable) {
            var index = variables.indexOf(programVariable);
            if (index != -1)
                variables.splice(index, 1);
            programVariable.global = null;
        };
        
        this.invalidate = function () {
            for (var i = 0, count = variables.length; i < count; i++)
                variables[i].needsUpdate = true;
        };
    }
    
    function GlobalVariableArray(length, elementsCtor) {
        
        for (var i = 0; i < length; i++)
            this[i] = new elementsCtor();
        
        this.addVariable = function (programVariable) {
            for (var i = 0 ; i < length; i++)
                this[i].addVariable(programVariable[i]);
            programVariable.global = this;
        };

        this.removeVariable = function (programVariable) {
            var len = Math.min(length, programVariable.length);
            for (var i = 0 ; i < len; i++)
                this[i].removeVariable(programVariable[i]);
            programVariable.global = null;
        };
                
        this.invalidate = function () {
            for (var i = 0; i < length ; i++)
                this[i].invalidate();            
        };
                        
        this.resize = function (len) {
            var i;
            if (len < length)
                for (i = len; i < length; i++)
                    this[i] = null;
            else if (len > length)
                for (i = length; i < len; i++)
                    this[i] = new elementsCtor();
            length = len;
        };
    }

    function GlobalVariableStruct(fields) {
        
        for (var key in fields)
            this[key] = new (fields[key])();
                
        this.addVariable = function (programVariable) {
            for (var key in fields) {
                var fieldVariable = programVariable[key];
                if (fieldVariable != null)
                    this[key].addVariable(fieldVariable);
            }
            programVariable.global = this;
        };

        this.removeVariable = function (programVariable) {
            for (var key in fields) {
                var fieldVariable = programVariable[key];
                if (fieldVariable != null)
                    this[key].removeVariable(fieldVariable);
            }
            programVariable.global = null;
        };

        this.invalidate = function () {
            for (var key in fields)
                this[key].invalidate();
        };
    }
        
    function RendererVariable(setFun) {
        this.needsUpdate = true;
        this.setFun = setFun;
        this.releaseFun = function () {
            if (this.global != null)
                this.global.removeVariable(this);
        };
        this.global = null;
    }

    function SceneRendererVariable(object, propertyName) {
        return function (programVariable) {
            RendererVariable.call(this, function () {
                if (this.needsUpdate) {
                    programVariable.value = object[propertyName];
                    this.needsUpdate = false;
                }
            });
        };
    }

    function SceneRendererVariableStruct(object, properties) {

        var propertiesCtors = {};
        var count = properties.length;
        var i;
        for (i = 0; i < count; i++) {
            var key = properties[i];
            propertiesCtors[key] = SceneRendererVariable(object, key);
        }

        return function (programVariable) {

            for (i = 0; i < count; i++) {
                var key = properties[i];
                var ctor = propertiesCtors[key];
                this[key] = new ctor(programVariable[key]);
            }

            RendererVariable.call(this, function () {
                for (i = 0; i < count; i++) {
                    var key = properties[i];
                    var prop = this[key];
                    prop.setFun.apply(prop, arguments);
                }
            });
        };
    }

    //objects is a SortArray
    function SceneRendererVariableArray(objects, ctor) {
        return function (programVariable) {

            var count = Math.min(programVariable.length, objects.length);

            for (var i = 0 ; i < count; i++) {
                var elementCtor = ctor(objects.get(i));
                this[i] = new elementCtor(programVariable[i]);
            }

            RendererVariable.call(this, function () {
                var count = Math.min(programVariable.length, objects.length);
                for (var i = 0 ; i < count; i++) {
                    var element = this[i];
                    element.setFun.apply(element, arguments);
                }
            });
        };
    }

    function CustomVariable(programVariable, variableDesc) {
        var fun;
        var setFun = variableDesc.setFun;
        var checkFun = variableDesc.checkFun;
        if (checkFun == null)
            fun = function (force) {
                setFun(programVariable);
            };
        else
            fun = function (force) {
                if (force || checkFun())
                    setFun(programVariable);
            };

        RendererVariable.call(this, fun);
    }

    function ObjectListener(events, listeners) {

        var eventsCount = events.length;

        this.target = null;
        var _this = this;
        this.setTarget = function (o) {
            var target = _this.target;

            if (o == target)
                return;

            if (target != null)
                for (var i = 0; i < eventsCount; i++)
                    target.removeEventListener(events[i], listeners[i]);

            target = o;
            _this.target = target;

            if (o == null)
                return;

            for (var i = 0; i < eventsCount; i++)
                target.addEventListener(events[i], listeners[i]);
        };
    }

    //directional lights 

    function DirectionalLightsGlobalVariable(length) {
        GlobalVariableArray.call(this, length, DirectionalLightGlobalVariable);
    }
        
    function DirectionalLightGlobalVariable() {

        GlobalVariableStruct.call(this, {
            color: GlobalVariable,
            direction: GlobalVariable
        });

        var _this = this;

        function colorChangedListener() {
            _this.color.invalidate();
        }

        function directionChangedListener() {
            _this.direction.invalidate();
        }

        ObjectListener.call(this, ['colorChanged', 'directionChanged'], [colorChangedListener, directionChangedListener]);
    }
        
    function DirectionalLightsRendererVariable(dirLights) {
        return SceneRendererVariableArray(dirLights, DirectionalLightRendererVariable);
    }

    function DirectionalLightRendererVariable(dirLight) {
        return SceneRendererVariableStruct(dirLight, ['color', 'direction']);
    }

    //spot lights

    function SpotLightsGlobalVariable(length) {
        GlobalVariableArray.call(this, length, SpotLightGlobalVariable);
    }

    function SpotLightGlobalVariable() {

        GlobalVariableStruct.call(this, {
            color: GlobalVariable,
            direction: GlobalVariable,
            position: GlobalVariable,
            attenuationAndSpot: GlobalVariable
        });

        var _this = this;

        function colorChangedListener() {
            _this.color.invalidate();
        }

        function directionChangedListener() {
            _this.direction.invalidate();
        }

        function positionChangedListener() {
            _this.position.invalidate();
        }

        function attenuationAndSpotChangedListener() {
            _this.attenuationAndSpot.invalidate();
        }

        ObjectListener.call(this,
            ['colorChanged', 'directionChanged', 'spotChanged', 'positionChanged', 'attenuationChanged'],
            [colorChangedListener, directionChangedListener, attenuationAndSpotChangedListener,
                positionChangedListener, attenuationAndSpotChangedListener]
            );
    }
                
    function SpotLightsRendererVariable(spotLights) {
        return SceneRendererVariableArray(spotLights, SpotLightRendererVariable);
    }

    function SpotLightRendererVariable(spotLight) {
        return SceneRendererVariableStruct(spotLight, ['color', 'direction', 'position', 'attenuationAndSpot']);
    }

    //directional and spot shadows
        
    function DirSpotShadowMapsSizeAndBiasGlobalVariable(length) {
        GlobalVariableArray.call(this, length, DirSpotShadowMapSizeAndBiasGlobalVariable);
    }

    function DirSpotShadowMapSizeAndBiasGlobalVariable() {
        GlobalVariable.call(this);

        var _this = this;

        function shadowMapSizeAndBiasChangedListener() {
            _this.invalidate();
        }

        ObjectListener.call(this, ['shadowMapSizeChanged', 'shadowBiasChanged'], [
            shadowMapSizeAndBiasChangedListener,
            shadowMapSizeAndBiasChangedListener]);
    }

    function DirSpotShadowMapsSizeAndBiasRendererVariable(dirLights) {
        return SceneRendererVariableArray(dirLights, DirSpotShadowMapSizeAndBiasRendererVariable);
    }

    function DirSpotShadowMapSizeAndBiasRendererVariable(dirLight) {
        return SceneRendererVariable(dirLight, 'shadowMapSizeAndBias');
    }

    function DirSpotShadowTransformsGlobalVariable(length) {
        GlobalVariableArray.call(this, length, DirSpotShadowTransformGlobalVariable);
    }

    function DirSpotShadowTransformGlobalVariable() {
        GlobalVariable.call(this);

        var _this = this;

        function shadowTransformChangedListener() {
            _this.invalidate();
        }

        ObjectListener.call(this, ['shadowTransformChanged'], [shadowTransformChangedListener]);
    }

    function DirSpotShadowTransformsRendererVariable(dirLights) {
        return SceneRendererVariableArray(dirLights, DirSpotShadowTransformRendererVariable);
    }

    function DirSpotShadowTransformRendererVariable(dirLight) {
        return SceneRendererVariable(dirLight, 'shadowTransform');
    }
        

    function PointLightsGlobalVariable(length) {
        GlobalVariableArray.call(this, length, PointLightGlobalVariable);
    }

    function PointLightGlobalVariable() {

        GlobalVariableStruct.call(this, {
            color: GlobalVariable,
            positionAndRange: GlobalVariable,
            attenuation: GlobalVariable
        });

        var _this = this;

        function colorChangedListener() {
            _this.color.invalidate();
        }

        function positionAndRangeChangedListener() {
            _this.positionAndRange.invalidate();
        }

        function attenuationChangedListener() {
            _this.attenuation.invalidate();
        }

        ObjectListener.call(this,
            ['colorChanged', 'positionChanged', 'rangeChanged', 'attenuationChanged'],
            [colorChangedListener, positionAndRangeChangedListener, positionAndRangeChangedListener, attenuationChangedListener]);
    }

    function PointLightsRendererVariable(pointLights) {
        return SceneRendererVariableArray(pointLights, PointLightRendererVariable);
    }

    function PointLightRendererVariable(pointLight) {
        return SceneRendererVariableStruct(pointLight, ['color', 'positionAndRange', 'attenuation']);
    }
        
    function PointPositionAndBiasesGlobalVariable(length) {
        GlobalVariableArray.call(this, length, PointPositionAndBiasGlobalVariable);
    }

    function PointPositionAndBiasGlobalVariable() {
        GlobalVariable.call(this);

        var _this = this;

        function positionAndBiasChangedListener() {
            _this.invalidate();
        }

        ObjectListener.call(this, ['positionChanged', 'shadowBiasChanged'],
        [positionAndBiasChangedListener, positionAndBiasChangedListener]);
    }

    function PointPositionAndBiasesRendererVariable(pointLights) {
        return SceneRendererVariableArray(pointLights, PointPositionAndBiasRendererVariable);
    }

    function PointPositionAndBiasRendererVariable(pointLight) {
        return SceneRendererVariable(pointLight, 'positionAndBias');
    }
        
    //shadow maps
    function ShadowMapsGlobalVariable(length) {
        GlobalVariableArray.call(this, length, ShadowMapGlobalVariable);
    }

    function ShadowMapGlobalVariable() {
        GlobalVariable.call(this);

        var _this = this;

        function shadowMapChangedListener() {
            _this.invalidate();
        }

        ObjectListener.call(this, ['shadowMapChanged'], [shadowMapChangedListener]);
    }

    function ShadowMapsRendererVariable(lights) {
        return SceneRendererVariableArray(lights, ShadowMapRendererVariable);
    }

    function ShadowMapRendererVariable(light) {
        return SceneRendererVariable(light, 'shadowMapTexture');
    }


    function SimpleGlobalVariableListener(eventsNames) {
        GlobalVariable.call(this);

        var _this = this;

        function changedListener() {
            _this.invalidate();
        }
        var eventsCount = eventsNames.length;
        var listeners = [];
        for (var i = 0 ; i < eventsCount; i++)
            listeners[i] = changedListener;

        ObjectListener.call(this, eventsNames, listeners);
    }

    function AmbientLightGlobalVariable() {
        SimpleGlobalVariableListener.call(this, ['ambientLightChanged']);
    }

    function AmbientLightVariable(scene) {
        return SceneRendererVariable(scene, 'ambientLight');
    }
        
    function FogColorGlobalVariable() {
        SimpleGlobalVariableListener.call(this, ['fogColorChanged']);
    }

    function FogColorVariable(scene) {
        return SceneRendererVariable(scene, 'fogColor');
    }

    function FogStartDistanceAndRangeGlobalVariable() {
        SimpleGlobalVariableListener.call(this, ['fogStartDistanceChanged', 'fogRangeChanged']);
    }

    function FogStartDistanceAndRangeVariable(scene) {
        return SceneRendererVariable(scene, 'fogStartDistanceAndRange');
    }

    function InvSquaredSceneSizeGlobalVariable() {
        SimpleGlobalVariableListener.call(this, ['sceneSizeChanged']);
    }

    function InvSquaredSceneSizeVariable(scene) {
        return SceneRendererVariable(scene, 'invSquaredSceneSize');
    }

    function ProjViewVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            if (this.needsUpdate) {
                var camera = state.activeCamera;
                programVariable.value = camera.projectionView;
                this.needsUpdate = false;
            }
        });
    }

    function ProjectionVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            if (this.needsUpdate) {
                var camera = state.activeCamera;
                programVariable.value = camera.projection;
                this.needsUpdate = false;
            }
        });
    }

    function ViewVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            if (this.needsUpdate) {
                var camera = state.activeCamera;
                programVariable.value = camera.view;
                this.needsUpdate = false;
            }
        });
    }

    function EyePositionVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            if (this.needsUpdate) {
                var camera = state.activeCamera;
                programVariable.value = camera.object3D.transformComponent.worldPosition;
                this.needsUpdate = false;
            }
        });
    }

    function WorldVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            var object3D = state.currObject;
            programVariable.value = object3D.transformComponent.worldTransform;
        });
    }

    function WorldInvTransposeVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            var object3D = state.currObject;
            programVariable.value = object3D.transformComponent.worldInvTranspose;
        });
    }

    function ProjViewWorldVariable(programVariable) {
        RendererVariable.call(this, (function () {

            var projViewWorld = new VMath.Matrix4();
            return function (state) {
                var camera = state.activeCamera;
                var object3D = state.currObject;
                programVariable.value = VMath.Matrix4.multiply(camera.projectionView, object3D.transformComponent.worldTransform, projViewWorld);
            };

        })());
    }

    function BonesTransformsVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            var skeleton = state.currSkeleton;
            var skin = state.currMesh;
            skeleton.getBonesTransforms(skin.influences, skin.bonesTransforms);
            programVariable.value = skin.bonesTransforms;
        });
    }

    function BonesInvTransposesVariable(programVariable) {
        RendererVariable.call(this, function (state) {
            var skeleton = state.currSkeleton;
            var skin = state.currMesh;
            skeleton.getBonesInvTransposes(skin.influences, skin.bonesInvTransposes);
            programVariable.value = skin.bonesInvTransposes;
        });
    }

    return Object.freeze({

        GlobalVariable: GlobalVariable,
        GlobalVariableStruct: GlobalVariableStruct,
        GlobalVariableArray: GlobalVariableArray,

        RendererVariable: RendererVariable,
        SceneRendererVariable: SceneRendererVariable,
        SceneRendererVariableStruct: SceneRendererVariableStruct,
        SceneRendererVariableArray: SceneRendererVariableArray,

        CustomVariable: CustomVariable,

        DirectionalLightsGlobalVariable : DirectionalLightsGlobalVariable,
        DirectionalLightsRendererVariable: DirectionalLightsRendererVariable,
        
        SpotLightsGlobalVariable : SpotLightsGlobalVariable,
        SpotLightsRendererVariable: SpotLightsRendererVariable,

        DirSpotShadowMapsSizeAndBiasGlobalVariable : DirSpotShadowMapsSizeAndBiasGlobalVariable,
        DirSpotShadowMapsSizeAndBiasRendererVariable : DirSpotShadowMapsSizeAndBiasRendererVariable,

        DirSpotShadowTransformsGlobalVariable: DirSpotShadowTransformsGlobalVariable,
        DirSpotShadowTransformsRendererVariable : DirSpotShadowTransformsRendererVariable,

        PointLightsGlobalVariable: PointLightsGlobalVariable,
        PointLightsRendererVariable : PointLightsRendererVariable,

        PointPositionAndBiasesGlobalVariable: PointPositionAndBiasesGlobalVariable,
        PointPositionAndBiasesRendererVariable : PointPositionAndBiasesRendererVariable,

        ShadowMapsGlobalVariable: ShadowMapsGlobalVariable,
        ShadowMapsRendererVariable : ShadowMapsRendererVariable,

        AmbientLightGlobalVariable : AmbientLightGlobalVariable,
        AmbientLightVariable: AmbientLightVariable,

        FogColorGlobalVariable: FogColorGlobalVariable,
        FogColorVariable : FogColorVariable,
        
        FogStartDistanceAndRangeGlobalVariable: FogStartDistanceAndRangeGlobalVariable,
        FogStartDistanceAndRangeVariable : FogStartDistanceAndRangeVariable,
        
        InvSquaredSceneSizeGlobalVariable: InvSquaredSceneSizeGlobalVariable,
        InvSquaredSceneSizeVariable: InvSquaredSceneSizeVariable,

        ProjViewVariable: ProjViewVariable,
        ProjectionVariable: ProjectionVariable,
        ViewVariable : ViewVariable,

        EyePositionVariable : EyePositionVariable,
        WorldVariable : WorldVariable,

        WorldInvTransposeVariable : WorldInvTransposeVariable,
        ProjViewWorldVariable : ProjViewWorldVariable,

        BonesTransformsVariable : BonesTransformsVariable,        
        BonesInvTransposesVariable: BonesInvTransposesVariable
    });
});