define(['engine/Object3D', 'core/Textures', 'core/VMath', 'core/Rectangles', './Cameras'],

    function (Object3D, Textures, VMath, Rectangles, Cameras) {

        'use strict';

        var Component = Object3D.Component;
        var ComponentType = Object3D.ComponentType;
        Object3D = Object3D.Object3D;
        
        var shadowMapTextureParameters = {
            magnification: Textures.TextureFilter.NEAREST,
            minification: Textures.TextureFilter.NEAREST,
            wrapS: Textures.TextureWrapMode.CLAMP_TO_EDGE, wrapT: Textures.TextureWrapMode.CLAMP_TO_EDGE
        };

        var colorChangedEvent = 'colorChanged';
        var castShadowsChangedEvent = 'castShadowsChanged';
        var shadowMapSizeChangedEvent = 'shadowMapSizeChanged';
        var shadowBiasChangedEvent = 'shadowBiasChanged';
        
        function Light(shadowMapSize, shadowBias, createShadowMap) {

            Component.call(this);

            var color = new VMath.Vector4();                      
            shadowMapSize = shadowMapSize != null ? shadowMapSize : new VMath.Vector2(512, 512);
            shadowBias = shadowBias != null ? shadowBias : 0.0;                        
            var shadowMapViewPort = Rectangles.createViewPort(shadowMapSize.x, shadowMapSize.y);
            var castShadows = false;

            Object.defineProperties(this, {

                color: {
                    get: function () {
                        return color;
                    },
                    set: function (v) {
                        if(color != v)
                            color.fromVector4(v);
                        this.trigger(colorChangedEvent);
                    }
                },

                castShadows: {
                    get: function () {
                        return castShadows;
                    },

                    set: function (v) {
                        castShadows = v;
                        this.trigger(castShadowsChangedEvent);
                    }                    
                },
                
                shadowMapSize: {
                    get: function () {
                        return shadowMapSize;
                    },
                    set: function (v) {
                        if (v != shadowMapSize)
                            shadowMapSize.fromVector2(v);
                        shadowMapViewPort.release();
                        shadowMapViewPort = Rectangles.createViewPort(shadowMapSize.x, shadowMapSize.y);
                        this.trigger(shadowMapSizeChangedEvent);
                    }
                },

                shadowBias: {
                    get: function () {
                        return shadowBias;
                    },

                    set: function (v) {
                        shadowBias = v;
                        this.trigger(shadowBiasChangedEvent);
                    }
                },

                shadowMapSizeAndBias: {
                    get: (function () {
                        var shadowMapSizeAndBias = new Float32Array(3);
                        return function () {
                            shadowMapSizeAndBias[0] = shadowMapSize.x;
                            shadowMapSizeAndBias[1] = shadowMapSize.y;
                            shadowMapSizeAndBias[2] = shadowBias;
                            return shadowMapSizeAndBias;
                        };
                    })()
                },

                shadowMapViewPort: {
                    get: function () {
                        return shadowMapViewPort;
                    }
                }

            });

            if (createShadowMap != null && !createShadowMap)
                return;

            var shadowMapTexture = Textures.createTexture(null, shadowMapSize.x, shadowMapSize.y, shadowMapTextureParameters);
            
            this.addEventListener(shadowMapSizeChangedEvent, function () {
                shadowMapTexture.width = shadowMapSize.x;
                shadowMapTexture.height = shadowMapSize.y;
            });
                        
            var shadowMapRenderTarget = Textures.createRenderTarget(shadowMapTexture);
            shadowMapRenderTarget.generateMipMaps = false;

            Object.defineProperties(this, {

                shadowMapTexture: {
                    get: function () {
                        return  shadowMapTexture;
                    }
                },

                shadowMapRenderTarget: {
                    value: shadowMapRenderTarget                    
                }
            });
        }

        Light.prototype = Object.create(Component.prototype);
        Object.defineProperties(Light.prototype, {
            constructor: { value: Light },

            componentType: {
                value: ComponentType.Light
            }
        });
                           
        
        //transform ndc space [-1,1]^3 to texture space [0,1]^3 
        var ndcToTextSpace = new VMath.Matrix4().scale(new VMath.Vector3(0.5, 0.5, 0.5)).translate(new VMath.Vector3(1.0, 1.0, 1.0));

        function ShadowProperties(lightCameraParams, shadowTransformNeedsUpdate, onUpdatedShadowTransform) {

            var lightCameraObject = new Object3D();
            var lightCamera = new Cameras.Camera(lightCameraParams);
            lightCameraObject.addComponent(lightCamera);

            lightCamera.renderTarget = this.shadowMapRenderTarget;
            lightCamera.viewPort = this.shadowMapViewPort;
            lightCamera.renderSortType = Cameras.RenderSortType.DONT_CARE;

            var _this = this;

            this.addEventListener(shadowMapSizeChangedEvent, function () {
                var size = _this.shadowMapSize;
                lightCamera.viewPort = _this.shadowMapViewPort;
                lightCamera.aspectRatio = size.x / size.y;                
            });
            
            var shadowTransform = new VMath.Matrix4();
            
            Object.defineProperties(this, {
                
                lightCamera: {
                    get: function () {
                        return lightCamera;
                    }
                },     
                
                shadowTransform: {
                    get: function () {
                        if (shadowTransformNeedsUpdate()) {
                            shadowTransform.fromMat4(ndcToTextSpace);
                            shadowTransform.multiply(lightCamera.projectionView);                                
                            onUpdatedShadowTransform();                            
                        }
                        return shadowTransform;
                    }
                }                   
            });            
        }
        
        var shadowTransformChangedEvent = 'shadowTransformChanged';
        var directionChangedEvent = 'directionChanged';
                
        function DirectionalLight(shadowMapSize, shadowBias) {

            Light.call(this, shadowMapSize, shadowBias);
                       
            var shadowTransformNeedsUpdate = true;
            var _this = this;

            ShadowProperties.call(this, { isPerspective: false },
                function () {
                    return shadowTransformNeedsUpdate;
                },

                function () {
                    shadowTransformNeedsUpdate = false;                    
                }
            );

            function onShadowTransformChanged() {
                shadowTransformNeedsUpdate = true;
                _this.trigger(shadowTransformChangedEvent);
            }
            
            var lightCamera = this.lightCamera;
            lightCamera.addEventListener('projectionChanged', onShadowTransformChanged);
            var cameraTransformComponent = lightCamera.object3D.transformComponent;
            var transformComponent;
            function onTransformChanged() {
                cameraTransformComponent.position = transformComponent.worldPosition;
                cameraTransformComponent.forward = transformComponent.worldForward;                
                _this.trigger(directionChangedEvent);
                onShadowTransformChanged();
            }
            
            Object.defineProperties(this, {
                                                
                onActivated : {
                    value: function () {
                        transformComponent = this.object3D.transformComponent;
                        transformComponent.addEventListener('transformChanged', onTransformChanged);                        
                    }
                },

                onDeactivated : {
                    value: function () {                        
                        transformComponent.removeEventListener('transformChanged', onTransformChanged);                        
                        transformComponent = null;                        
                    }
                },

                direction: {
                    get: function () {                        
                        return transformComponent.worldForward;
                    },
                    set: function (v) {                        
                        transformComponent.worldForward = v;                        
                    }                    
                },

                setVolume : {
                    value: function (baseEdge, height) {
                        var lightCamera = this.lightCamera;
                        lightCamera.left = -baseEdge;
                        lightCamera.right = baseEdge;
                        lightCamera.top = baseEdge;
                        lightCamera.bottom = -baseEdge;
                        lightCamera.near = 0.0;
                        lightCamera.far = height;
                        shadowTransformNeedsUpdate = true;
                        this.trigger(shadowTransformChangedEvent);
                    }
                }
            });
        }

        DirectionalLight.prototype = Object.create(Light.prototype);
        Object.defineProperties(DirectionalLight.prototype, {
            constructor: { value: DirectionalLight },
            clone: {
                value: function () {
                    var dirLight = new DirectionalLight(this.shadowMapSize, this.shadowBias);
                    dirLight.castShadows = this.castShadows;
                    dirLight.color = this.color;
                    var lightCamera = this.lightCamera;
                    dirLight.setVolume(lightCamera.top, lightCamera.far);
                    return dirLight;
                }
            }
        });
        
        var positionChangedEvent = 'positionChanged';
        var spotChangedEvent = 'spotChanged';        
        var attenuationChangedEvent = 'attenuationChanged';

        //constructor
        function SpotLight(shadowMapSize, shadowBias) {

            Light.call(this, shadowMapSize, shadowBias);
                        
            var attenuation = new VMath.Vector3(0.0, 0.0, 1.0);
            var spot = 16.0;
                        
            var shadowTransformNeedsUpdate = true;
            
            ShadowProperties.call(this, { isPerspective: true, fovY: Math.PI / 2.0, aspectRatio: this.shadowMapSize.x / this.shadowMapSize.y, near: 0.1, far: 500.0 },
                function () {
                    return shadowTransformNeedsUpdate;
                },
                function () {
                    shadowTransformNeedsUpdate = false;
                }
            );
                        
            var _this = this;            

            function onShadowTransformChanged() {
                shadowTransformNeedsUpdate = true;
                _this.trigger(shadowTransformChangedEvent);
            }

            var lightCamera = this.lightCamera;
            lightCamera.addEventListener('projectionChanged', onShadowTransformChanged);
            
            var transformComponent;
            var cameraTransformComponent = lightCamera.object3D.transformComponent;
            function onPositionChanged() {                
                cameraTransformComponent.position = transformComponent.worldPosition;
                _this.trigger(positionChangedEvent);
                onShadowTransformChanged();
            }

            function onQuaternionChanged() {                
                cameraTransformComponent.forward = transformComponent.worldForward;
                _this.trigger(directionChangedEvent);
                onShadowTransformChanged();
            }
                        
            Object.defineProperties(this, {

                onActivated: {
                    value: function () {
                        transformComponent = this.object3D.transformComponent;                        
                        transformComponent.addEventListener('positionChanged', onPositionChanged);
                        transformComponent.addEventListener('quaternionChanged', onQuaternionChanged);
                        transformComponent.addEventListener('parentChanged', onPositionChanged);
                        transformComponent.addEventListener('parentChanged', onQuaternionChanged);                        
                    }
                },

                onDeactivated: {
                    value: function () {
                        transformComponent.removeEventListener('parentChanged', onPositionChanged);
                        transformComponent.removeEventListener('parentChanged', onQuaternionChanged);
                        transformComponent.removeEventListener('quaternionChanged', onQuaternionChanged);
                        transformComponent.removeEventListener('positionChanged', onPositionChanged);
                        transformComponent = null;
                    }
                },

                direction: {
                    get: function () {                        
                        return transformComponent.worldForward;
                    },
                    set: function (v) {                        
                        transformComponent.worldForward = v;                        
                    }
                },

                position: {
                    get: function () {
                        return transformComponent.worldPosition;
                    }
                },

                spot: {
                    get: function () { return spot; },
                    set: function (v) {
                        spot = v;
                        this.trigger(spotChangedEvent);
                    }
                },
                                                                                
                attenuation: {
                    get: function () { return attenuation; },
                    set: function (v) {
                        if(v != attenuation)
                            attenuation.fromVector3(v);                        
                        this.trigger(attenuationChangedEvent);
                    }                    
                },

                attenuationAndSpot: {
                    get: (function () {
                        var attenuationAndSpot = new VMath.Vector4();
                        return function () {
                            attenuationAndSpot.directionFromVector3(attenuation);
                            attenuationAndSpot.w = spot;
                            return attenuationAndSpot;
                        };
                    })()
                }
            });
        }

        //prototype
        SpotLight.prototype = Object.create(Light.prototype);
        Object.defineProperties(SpotLight.prototype, {
            constructor: { value: SpotLight },
            clone: {
                value: function () {
                    var spotLight = new SpotLight(this.shadowMapSize, this.shadowBias);
                    spotLight.color = this.color;
                    spotLight.castShadows = this.castShadows;
                    spotLight.spot = this.spot;
                    spotLight.attenuation = this.attenuation;
                    return spotLight;
                }
            }
        });
        
        var rangeChangedEvent = 'rangeChanged';
        
        //constructor
        function PointLight(shadowMapSize, shadowBias) {

            Light.call(this, shadowMapSize, shadowBias, false);
            
            var range = 5.0;
            var attenuation = new VMath.Vector3(0.0, 0.0, 1.0);
            var _this = this;
            //leave the parameter check to the parent
            shadowMapSize = this.shadowMapSize;

            var width = shadowMapSize.x;
            var height = shadowMapSize.y;

            var shadowMapTexture = Textures.createTextureCube(null, width, height, shadowMapTextureParameters);           
            var shadowMapRenderTargets = new Array(6);

            shadowMapRenderTargets[0] = Textures.createRenderTarget(shadowMapTexture, Textures.CubeMapFace.POSITIVE_X);
            shadowMapRenderTargets[1] = Textures.createRenderTarget(shadowMapTexture, Textures.CubeMapFace.NEGATIVE_X);
            shadowMapRenderTargets[2] = Textures.createRenderTarget(shadowMapTexture, Textures.CubeMapFace.POSITIVE_Y);
            shadowMapRenderTargets[3] = Textures.createRenderTarget(shadowMapTexture, Textures.CubeMapFace.NEGATIVE_Y);
            shadowMapRenderTargets[4] = Textures.createRenderTarget(shadowMapTexture, Textures.CubeMapFace.POSITIVE_Z);
            shadowMapRenderTargets[5] = Textures.createRenderTarget(shadowMapTexture, Textures.CubeMapFace.NEGATIVE_Z);
            
            var rootCameraObject = new Object3D();            
            var cameraObjects = new Array(6);
            var lightCameras = new Array(6);
                            
            var fovY = Math.PI * 0.5;
            var aspectRatio = width / height;

            for (var i = 0; i < 6; i++) {

                var camera = new Cameras.Camera({ isPerspective: true, fovY: fovY, aspectRatio: aspectRatio, near: 0.1, far: 500.0 });                    
                lightCameras[i] = camera;
                camera.renderOrder = Number.NEGATIVE_INFINITY;

                var renderTarget = shadowMapRenderTargets[i];
                renderTarget.generateMipMaps = false;
                camera.renderTarget = renderTarget;
                camera.viewPort = this.shadowMapViewPort;

                var cameraObject = new Object3D(rootCameraObject);
                cameraObjects[i] = cameraObject;
                cameraObject.addComponent(camera);
            }

            cameraObjects[0].transformComponent.setAxes(VMath.zAxisNeg, VMath.yAxisNeg, VMath.xAxis);
            cameraObjects[1].transformComponent.setAxes(VMath.zAxis, VMath.yAxisNeg, VMath.xAxisNeg);
            cameraObjects[2].transformComponent.forward = VMath.yAxis;
            cameraObjects[3].transformComponent.forward = VMath.yAxisNeg;
            cameraObjects[4].transformComponent.setAxes(VMath.xAxis, VMath.yAxisNeg, VMath.zAxis);
            cameraObjects[5].transformComponent.setAxes(VMath.xAxisNeg, VMath.yAxisNeg, VMath.zAxisNeg);


            this.addEventListener(shadowMapSizeChangedEvent, function () {
                shadowMapSize = _this.shadowMapSize;
                shadowMapTexture.width = shadowMapSize.x;
                shadowMapTexture.height = shadowMapSize.y;
                var viewPort = _this.shadowMapViewPort;
                var aspectRatio = shadowMapSize.x / shadowMapSize.y;
                for (var i = 0 ; i < 6; i++) {
                    var lightCamera = lightCameras[i];
                    lightCamera.viewPort = viewPort;
                    lightCamera.aspectRatio = aspectRatio;
                }
            });
            
            var transformComponent;
            var rootCameraObjectTransformComponent = rootCameraObject.transformComponent;
            
            function onPositionChanged() {
                rootCameraObjectTransformComponent.position = transformComponent.worldPosition;                
                _this.trigger(positionChangedEvent);
            }
                                                            
            Object.defineProperties(this, {
                                           
                onActivated: {
                    value: function () {
                        transformComponent = this.object3D.transformComponent;                        
                        transformComponent.addEventListener('positionChanged', onPositionChanged);
                        transformComponent.addEventListener('parentChanged', onPositionChanged);
                    }
                },

                onDeactivated: {
                    value: function () {
                        transformComponent.removeEventListener('parentChanged', onPositionChanged);
                        transformComponent.removeEventListener('positionChanged', onPositionChanged);
                        transformComponent = null;                        
                    }
                },

                range: {
                    get: function () { return range; },
                    set: function (v) {
                        range = v;                        
                        this.trigger(rangeChangedEvent);                        
                    }
                },

                positionAndRange : {
                    get: (function () {
                        var positionAndRange = new VMath.Vector4();
                        return function () {
                            positionAndRange.directionFromVector3(transformComponent.worldPosition);
                            positionAndRange.w = range;
                            return positionAndRange;
                        };
                    })()
                },
                
                attenuation: {
                    get: function () { return attenuation; },
                    set: function (v) {
                        if(v!= attenuation)
                            attenuation.fromVector3(v);
                        this.trigger(attenuationChangedEvent);
                    }
                },

                positionAndBias : {
                    get: (function () {
                        var positionAndBias = new VMath.Vector4();
                        return function () {
                            positionAndBias.directionFromVector3(transformComponent.worldPosition);
                            positionAndBias.w = this.shadowBias;
                            return positionAndBias;
                        };
                    })()
                },
                
                shadowMapTexture: {
                    value: shadowMapTexture                    
                },

                shadowMapRenderTarget: {
                    value: shadowMapRenderTargets                    
                },
                     
                lightCamera : {
                    get: function () {
                        return lightCameras;
                    }
                }
            });
        }
        PointLight.prototype = Object.create(Light.prototype);
        Object.defineProperties(PointLight.prototype, {
            constructor: { value: PointLight },
            clone: {
                value: function () {
                    var pointLight = new PointLight(this.shadowMapSize, this.shadowBias);                    
                    pointLight.color = this.color;
                    pointLight.castShadows = this.castShadows;
                    pointLight.range = this.range;
                    pointLight.attenuation = this.attenuation;
                    return pointLight;
                }
            }
        });
        
        return Object.freeze({
            DirectionalLight: DirectionalLight,
            PointLight: PointLight,
            SpotLight: SpotLight        
        });

    });

    