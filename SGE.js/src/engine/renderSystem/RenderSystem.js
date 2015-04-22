define(
    [
        'core/EventTarget', 'core/Pools', 'core/VMath', 'core/States',
        './Materials', 'core/Textures', 'core/Rectangles', './Programs', './Meshes',
        'Utils', './Lights', './Cameras', './Collisions', './ResourceManager', './RendererVariables', './MeshRendererComponent',
        'engine/Object3D', 'engine/System'
    ],

    function (EventTarget, Pools, VMath, States, Materials, Textures, Rectangles, Programs, Meshes, Utils,
        Lights, Cameras, Collisions, ResourceManager, RendererVariables, MeshRendererComponent, Object3D, System) {

        'use strict';
                
        var SkeletonComponentType = Object3D.ComponentType.Skeleton;

        function RenderSystem(device, parameters){

            System.call(this);

            var backGroundColor = null;
            if(parameters != null)
                backGroundColor = parameters.backGroundColor;
            if (backGroundColor == null)
                backGroundColor = [1.0, 1.0, 1.0, 1.0];            
            device.setClearColor(backGroundColor);

            var resourceManager = new ResourceManager(device);
            
            var state = {
                
                dirLights: new Utils.SortedArray(),
                shadowDirLights: new Utils.SortedArray(),

                spotLights: new Utils.SortedArray(),
                shadowSpotLights: new Utils.SortedArray(),
                
                pointLights: new Utils.SortedArray(),
                shadowPointLights: new Utils.SortedArray(),
                
                cameras : [],
                activeCamera: null,

                renderables: [new Utils.SortedArray()],
                emptyRenderLayer : new Utils.SortedArray(),
                transparentObjects: [],
                opaqueObjects: [],

                visibleObjects: [],
                
                perComponentReleaseFun: {},
                currScene: null,

                currObject: null,
                currSkeleton : null,
                currMesh : null,
                                
                globalVariables: {

                    dirLights: {
                        lights : new RendererVariables.DirectionalLightsGlobalVariable(0),
                        shadows: {
                            shadowLights: new RendererVariables.DirectionalLightsGlobalVariable(0),
                            shadowMaps: new RendererVariables.ShadowMapsGlobalVariable(0),
                            shadowMapsSizeAndBias: new RendererVariables.DirSpotShadowMapsSizeAndBiasGlobalVariable(0),
                            shadowTransforms: new RendererVariables.DirSpotShadowTransformsGlobalVariable(0)
                        }
                    },
                    
                    spotLights: {
                        lights: new RendererVariables.SpotLightsGlobalVariable(0),
                        shadows: {
                            shadowLights: new RendererVariables.SpotLightsGlobalVariable(0),
                            shadowMaps: new RendererVariables.ShadowMapsGlobalVariable(0),
                            shadowMapsSizeAndBias: new RendererVariables.DirSpotShadowMapsSizeAndBiasGlobalVariable(0),
                            shadowTransforms: new RendererVariables.DirSpotShadowTransformsGlobalVariable(0)
                        }
                    },

                    pointLights: {
                        lights: new RendererVariables.PointLightsGlobalVariable(0),
                        shadows: {
                            shadowLights: new RendererVariables.PointLightsGlobalVariable(0),
                            shadowMaps: new RendererVariables.ShadowMapsGlobalVariable(0),
                            positionAndBiases: new RendererVariables.PointPositionAndBiasesGlobalVariable(0)
                        }
                    },
                    
                    ambientLight: new RendererVariables.AmbientLightGlobalVariable(),
                    fogColor: new RendererVariables.FogColorGlobalVariable(),
                    fogStartDistanceAndRange: new RendererVariables.FogStartDistanceAndRangeGlobalVariable(),
                    invSquaredSceneSize: new RendererVariables.InvSquaredSceneSizeGlobalVariable(),

                    eyePosition: new RendererVariables.GlobalVariable(),
                    projectionView: new RendererVariables.GlobalVariable(),
                    view: new RendererVariables.GlobalVariable(),
                    projection : new RendererVariables.GlobalVariable()
                },
                
                materials : {},

                device: device,                
                resourceManager: resourceManager,                   
                rendererVariables: {}                
            };
            
            Object.defineProperties(this, {

                addComponent : {
                    value : function(component){                        
                        var releaseFun;
                        var componentDesc;

                        if(component instanceof Lights.DirectionalLight){
                            componentDesc = addDirectionalLight(component, state);
                            releaseFun = removeDirectionalLight;
                        }
                        else if (component instanceof Lights.SpotLight){
                            componentDesc = addSpotLight(component, state);
                            releaseFun = removeSpotLight;
                        }
                        else if( component instanceof Lights.PointLight){
                            componentDesc = addPointLight(component, state);
                            releaseFun = removePointLight;
                        }
                        else if (component instanceof Cameras.Camera){
                            componentDesc = addCamera(device, component, 0, state);
                            releaseFun = removeCamera;
                        }
                        else if (component instanceof MeshRendererComponent) {
                            componentDesc = addMeshRenderer(device, component, state);
                            releaseFun = removeMeshRenderer;
                        }
                        else
                            return;
                        
                        state.perComponentReleaseFun[component.ID] = { releaseFun : releaseFun, componentDesc : componentDesc };                        
                    }
                },

                removeComponent : {
                    value: function (component) {
                        var componentID = component.ID;
                        var releaseDesc = state.perComponentReleaseFun[componentID];
                        releaseDesc.releaseFun(device, releaseDesc.componentDesc, state);
                        state.perComponentReleaseFun[componentID] = null;
                    }
                },
                
                setScene : {
                    value: function (scene) {
                        setScene(scene, state);
                    }
                },

                update: {
                    value: function (dt) {
                        render(device, dt, state);
                    }
                }
            });
        }


        function render(dev, dt, state) {

            var cameras = state.cameras;
            var cameraCount = cameras.length;
            var renderables = state.renderables;

            for (var i = 0 ; i < cameraCount; i++) {
                var cameraDesc = cameras[i];
                var camera = cameraDesc.camera;
                setCamera(camera, state);
                var renderLayer = renderables[camera.renderLayer];
                if (renderLayer == null)
                    //if the expected behavior is the render target not cleared, then the camera should be removed
                    renderLayer = state.emptyRenderLayer;
                getVisibleObjects(cameraDesc, renderLayer, state);
                cameraPass(dev, cameraDesc, state);
            }
        }

        var renderableDescPool = Pools.createObjectPool(RenderableDesc, false);
        function RenderableDesc(object, mesh, ndcZ, materialDesc, materialIndex) {
            this.object = object;
            this.mesh = mesh;
            this.ndcZ = ndcZ;
            this.materialDesc = materialDesc;
            this.material = materialDesc.material;
            this.materialID = this.material.ID;            
            this.programID = materialDesc.programDesc.program.ID;
            this.materialIndex = materialIndex != null ? materialIndex : 0;
        }

        var getVisibleObjects = (function () {

            var r2 = new VMath.Vector4();
            var r3 = new VMath.Vector4();
            var v = new VMath.Vector4();

            function projectObject(worldPosition) {
                v.pointFromVector3(worldPosition);
                //perspective divide                
                return r2.dot(v) / r3.dot(v);
            }

            var worldSphere = new Collisions.Sphere();
            var worldAABB = new Collisions.AABB();
            var frustum;
            var bounds;
            var transformComponent;

            function visibleTestEnabled() {
                if (bounds != null) {

                    var worldBounds;

                    if (bounds instanceof Collisions.Sphere) {
                        worldSphere.fromSphere(bounds);
                        worldBounds = worldSphere;
                    } else if (bounds instanceof Collisions.AABB) {
                        worldAABB.fromAABB(bounds);
                        worldBounds = worldAABB;
                    }

                    worldBounds.transformByMatrix4(transformComponent.worldTransform);
                    return worldBounds.testFrustum(frustum);
                }
                return 1;
            }

            function visibleTestDisabled() {
                return 1;
            }

            return function (cameraDesc, renderables, state) {

                var camera = cameraDesc.camera;
                var castShadowsTest = cameraDesc.castShadowsTest;
                var getDepthMaterialFun = cameraDesc.getDepthMaterialFun;
                var visibles = state.visibleObjects;
                var visiblesLength = visibles.length;
                var visibleIndex = 0;

                var cameraProjectionView = camera.projectionView;
                cameraProjectionView.getRow(2, r2);
                cameraProjectionView.getRow(3, r3);

                var objectsCount = renderables.length;
                var materials = state.materials;
                
                frustum = camera.bounds;
                var visibleTest = camera.cullType == Cameras.CullType.DISABLED ? visibleTestDisabled : visibleTestEnabled;

                var cameraTransformComponent = camera.object3D.transformComponent;

                for (var i = 0 ; i < objectsCount; i++) {
                    var renderableDesc = renderables.get(i);
                    var renderable = renderableDesc.object;
                    var renderComponent = renderableDesc.meshRenderer;
                    transformComponent = renderable.transformComponent;

                    if (castShadowsTest && !renderComponent.castShadows)
                        continue;

                    renderComponent.setLevelByTransform(cameraTransformComponent);
                    var mesh = renderComponent.getMesh();
                    bounds = mesh.bounds;

                    if (visibleTest() == 0)
                        continue;

                    var ndcZ = projectObject(transformComponent.worldPosition);
                    var material;
                                        
                    if (castShadowsTest) {
                        var desc = visibles[visibleIndex];
                        material = getDepthMaterialFun(mesh, renderableDesc);                        
                        if (desc == null)
                            visibles[visibleIndex] = renderableDescPool.get(renderable, mesh, ndcZ, materials[material.ID]);
                        else
                            RenderableDesc.call(desc, renderable, mesh, ndcZ, materials[material.ID]);

                        visibleIndex++;
                        continue;
                    }

                    var materialCount = renderComponent.getMaterialsCount();
                    for (var j = 0; j < materialCount; j++) {
                        var desc = visibles[visibleIndex];
                        material = renderComponent.getMaterial(j);
                        if (desc == null)
                            visibles[visibleIndex] = renderableDescPool.get(renderable, mesh, ndcZ, materials[material.ID], j);
                        else
                            RenderableDesc.call(desc, renderable, mesh, ndcZ, materials[material.ID], j);
                        visibleIndex++;
                    }
                }

                visiblesLength -= visibleIndex;
                for (var i = 0; i < visiblesLength; i++)
                    renderableDescPool.release(visibles.pop());
            };

        })();

        function setCamera(camera, state) {
            state.activeCamera = camera;
            state.skyBox = camera.skyBox;
            var globals = state.globalVariables;
            globals.eyePosition.invalidate();
            globals.projectionView.invalidate();
            globals.view.invalidate();
        }

        function cameraPass(dev, cameraDesc, state) {

            var camera = cameraDesc.camera;
            var objects = state.visibleObjects;

            var cameraRenderTarget = camera.renderTarget;
            var keep = false;
            var postEffectMaterialsCount = camera.postEffectMaterialsCount;
            var cameraViewPort;

            if (postEffectMaterialsCount > 0) {

                cameraViewPort = cameraDesc.postViewPort;
                var renderTarget = cameraDesc.postRenderTarget;
                keep = true;
                                
                dev.setRenderTarget(renderTarget);

            } else {
                cameraViewPort = camera.viewPort;
                dev.setRenderTarget(cameraRenderTarget);
            }

            dev.setScissor(cameraViewPort);
            dev.setViewPort(cameraViewPort);
            dev.clearColorAndDepth();

            if (objects.length == 0) {
                if (!renderSkyBox(dev, cameraDesc, state))
                    dev.apply(); // force render target clearing

            } else {

                var renderSortType = camera.renderSortType;

                if (renderSortType == Cameras.RenderSortType.OPAQUE_FIRST)
                    renderSortFromCamera(dev, cameraDesc, objects, state);
                else {
                    if (renderSortType == Cameras.RenderSortType.DONT_CARE)
                        objects.sort(reversePainterSort);

                    renderObjectList(dev, objects, state);

                    renderSkyBox(dev, cameraDesc, state);
                }
            }

            if (!keep)
                return;

            var readRenderTarget = renderTarget;
            var writeRenderTarget;
            var renderTarget1;

            if (postEffectMaterialsCount > 1) {
                renderTarget1 = cameraDesc.postRenderTarget1;
                writeRenderTarget = renderTarget1;
            } else {
                writeRenderTarget = cameraRenderTarget;
                cameraViewPort = camera.viewPort;
            }

            for (var j = 0 ; j < postEffectMaterialsCount ; j++) {
                dev.setRenderTarget(writeRenderTarget);
                dev.setViewPort(cameraViewPort);
                dev.setScissor(cameraViewPort);
                dev.clearColorAndDepth();

                var mat = camera.getPostEffectMaterial(j);
                mat.frameRendered = readRenderTarget;
                setMat(dev, mat, state);
                renderMesh(dev, cameraDesc.postEffectGeometry);

                var temp = readRenderTarget;
                readRenderTarget = writeRenderTarget;
                writeRenderTarget = temp;
                if (j == postEffectMaterialsCount - 2) {
                    writeRenderTarget = cameraRenderTarget;
                    cameraViewPort = camera.viewPort;
                }
            }
        }

        function renderSkyBox(dev, cameraDesc, state) {
            var camera = cameraDesc.camera;
            var skyBox = camera.skyBox;
            if (skyBox == null)
                return false;
            var skyBoxMat = cameraDesc.skyBoxMaterial;
            skyBoxMat.skyBox = skyBox;
            setMat(dev, skyBoxMat, state);
            renderMesh(dev, cameraDesc.skyBoxGeometry);
            return true;
        }

        function renderSortFromCamera(dev, cameraDesc, objects, state) {

            var transparentObjects = state.transparentObjects;
            var opaqueObjects = state.opaqueObjects;

            objects = sort(objects, cameraDesc.camera.projectionView, opaqueObjects, transparentObjects);

            renderObjectList(dev, opaqueObjects, state);

            renderSkyBox(dev, cameraDesc, state);

            renderObjectList(dev, transparentObjects, state);

            Utils.emptyArray(opaqueObjects);
            Utils.emptyArray(transparentObjects);
        }

        function sort(objects, projectionView, opaqueObjects, transparentObjects) {

            var objectCount = objects.length;

            for (var i = 0 ; i < objectCount; i++) {
                var object = objects[i];
                if (isTransparent(object.material))
                    transparentObjects.push(object);
                else
                    opaqueObjects.push(object);
            }

            //draw front-to-back opaque objects (early depth-test when available)
            opaqueObjects.sort(reversePainterSort);

            //draw back-to-front transparent objects
            transparentObjects.sort(painterSort);

            return objects;
        }

        function renderObjectList(dev, objects, state) {
            var count = objects.length;
            for (var i = 0 ; i < count; i++) {
                var object = objects[i];
                var materialDesc = object.materialDesc;
                var material = object.material;                
                setMat(dev, material, state, materialDesc);
                var mesh = object.mesh;
                state.currMesh = mesh;
                setObject(dev, object.object, material, state);
                renderMesh(dev, mesh);                
            }
        }
                
        function renderMesh(dev, mesh) {
            dev.setVertexBuffers(mesh.vertexBuffer);
            dev.setIndexBuffer(mesh.indexBuffer);
            dev.setPrimitiveTopology(mesh.primitiveTopology);
            dev.apply();
            dev.drawAuto();
        }

        function setObject(dev, object3D, material, state) {
            state.currObject = object3D;
            state.currSkeleton = object3D.getComponent(SkeletonComponentType);
            var rendererVariables = state.perObjectUpdate;
            for (var i = 0, count = rendererVariables.length; i < count ; i++)
                rendererVariables[i].setFun(state);
        }

        function isTransparent(material) {
            var blendState = material.blendState;
            if (blendState != null && States.BlendState.NONE !== blendState)
                return true;
            else
                return false;
        }

        /*
        * priority : 
        * 1. depth (back-to-front)
        * 2. material index (multipass)
        * 3. material
        * 4. program
        */
        function painterSort(object1, object2) {
            
            var res = object2.ndcZ - object1.ndcZ;

            if (VMath.Utils.equalsFloat(res, 0.0)) {
                res = object1.materialIndex - object2.materialIndex;
                if (res != 0)
                    return res;
                res = object1.materialID - object2.materialID;
                if (res != 0)
                    return res;
                return object1.programID - object2.programID;
            }
            else
                return res;
        }

        /*
        * priority : 
        * 1. material index (multipass)
        * 2. material
        * 3. program
        * 3. depth (front-to-back)
        */
        function reversePainterSort(object1, object2) {
            var res = object1.materialIndex - object2.materialIndex;
            if (res != 0)
                return res;
            res = object1.materialID - object2.materialID;
            if (res != 0)
                return res;
            res = object1.programID - object2.programID;
            if (res != 0)
                return res;
            
            return object1.ndcZ - object2.ndcZ;
        }
        
        function setScene(scene, state) {

            releaseScene(state);

            state.currScene = scene;

            if (scene == null)
                return;

            var globalVariables = state.globalVariables;
            globalVariables.ambientLight.setTarget(scene);
            globalVariables.fogColor.setTarget(scene);
            globalVariables.fogStartDistanceAndRange.setTarget(scene);
            globalVariables.invSquaredSceneSize.setTarget(scene);

            createRendererVariables(state);
        }
                
        function releaseScene(state) {
            var scene = state.currScene;
            if (scene == null)
                return;
            state.currScene = null;

            var globalVariables = state.globalVariables;
            globalVariables.ambientLight.setTarget(null);
            globalVariables.fogColor.setTarget(null);
            globalVariables.fogStartDistanceAndRange.setTarget(null);
            globalVariables.invSquaredSceneSize.setTarget(null);
        }
                
        function addLight(light, lights, globalVariable) {

            var index = lights.insert(light);

            var lightsCount = lights.length;
            if (index == lightsCount - 1) {
                globalVariable.resize(lightsCount);
                globalVariable[index].setTarget(light);
            }
            else {
                globalVariable.resize(lightsCount);
                //shift lights listeners                    
                for (var i = index ; i < lightsCount ; i++) {
                    var variable = globalVariable[i];
                    variable.setTarget(lights.get(i));
                    variable.invalidate();
                }
            }
        }

        function removeLight(light, lights, globalVariable) {

            var lightsCount = lights.length;
            var index = lights.remove(light);
                        
            if (index == lightsCount - 1) {
                //release light listener
                globalVariable[index].setTarget(null);
                globalVariable.resize(index);
            } else {
                //shift lights listeners                    
                lightsCount--;
                for (var i = index ; i < lightsCount  ; i++) {
                    var variable = globalVariable[i];
                    variable.setTarget(lights.get(i));
                    variable.invalidate();
                }                
                globalVariable[lightsCount].setTarget(null);
                globalVariable.resize(lightsCount);
            }            
        }

        function addLightShadowCaster(light, lights, globalVariables) {
                       
            var index = lights.insert(light);
            
            var lightsCount = lights.length;
            if(index == lightsCount - 1)
                for (var key in globalVariables) {
                    var globalVariable = globalVariables[key];
                    globalVariable.resize(lightsCount);
                    globalVariable[index].setTarget(light);                    
                }
            else
                for (var key in globalVariables) {
                    var globalVariable = globalVariables[key];
                    globalVariable.resize(lightsCount);
                    //shift lights listeners                    
                    for (var i = index ; i < lightsCount ; i++) {
                        var variable = globalVariable[i];
                        variable.setTarget(lights.get(i));
                        variable.invalidate();
                    }
                }
        }

        function removeLightShadowCaster(light, lights, globalVariables) {

            var lightsCount = lights.length;
            var index = lights.remove(light);
            
            if (index == lightsCount - 1)
                for (var key in globalVariables) {
                    var globalVariable = globalVariables[key];
                    //release light listener
                    globalVariable[index].setTarget(null);
                    globalVariable.resize(index);
                }
            else {
                lightsCount--;
                for (var key in globalVariables) {
                    var globalVariable = globalVariables[key];
                    //shift lights listeners                    
                    for (var i = index ; i < lightsCount ; i++) {
                        var variable = globalVariable[i];
                        variable.setTarget(lights.get(i));
                        variable.invalidate();
                    }
                    globalVariable[lightsCount].setTarget(null);
                    globalVariable.resize(lightsCount);
                }
            }
        }

        //DirectionalLight, SpotLight and PointLight component descriptor
        function LightDesc(light, lights, shadowLights, globalVariables, state) {

            //reference to the component
            this.light = light;
            //is the component lighting the scene?
            this.lighting = !light.castShadows;

            var castingShadows = false;
            var pointLight = light instanceof Lights.PointLight;
            var lightCameraDesc = pointLight ? [] : null;

            var _this = this;

            this.castShadowsListener = function (refreshMaterials) {                
                var lighting = _this.lighting;
                var lightCastShadows = light.castShadows;
                var lightCamera = light.lightCamera;
                var refresh = true;

                if (castingShadows && !lightCastShadows) {
                    removeLightShadowCaster(light, shadowLights, globalVariables.shadows);
                    if (!pointLight)
                        removeCamera(state.device, lightCameraDesc, state);
                    else
                        for (var i = 0; i < 6; i++)
                            removeCamera(state.device, lightCameraDesc[i], state);
                    if (!lighting) {
                        addLight(light, lights, globalVariables.lights);
                        lighting = true;
                    }
                }
                else if (!castingShadows && lightCastShadows) {
                    if (lighting) {
                        removeLight(light, lights, globalVariables.lights);
                        lighting = false;
                    }
                    addLightShadowCaster(light, shadowLights, globalVariables.shadows);
                    if (!pointLight) {
                        lightCamera.renderOrder = Number.NEGATIVE_INFINITY;
                        lightCameraDesc = addCamera(state.device, lightCamera, 1, state);
                    } else {
                        for (var i = 0 ; i < 6; i++) {
                            var camera = lightCamera[i];
                            camera.renderOrder = Number.NEGATIVE_INFINITY;
                            lightCameraDesc[i] = addCamera(state.device, camera, 2, state);
                        }
                    }
                } else
                    refresh = false;

                castingShadows = lightCastShadows;
                _this.lighting = lighting;

                if (refresh && (refreshMaterials == null || refreshMaterials))
                    state.resourceManager.refreshLitMaterials(state);
            };
        }

        function addLightDesc(light, lights, shadowLights, globalVariables, state) {
            
            if (!light.castShadows)
                addLight(light, lights, globalVariables.lights);
            var lightDesc = new LightDesc(light, lights, shadowLights, globalVariables, state);
            var castShadowsListener = lightDesc.castShadowsListener;
            light.addEventListener('castShadowsChanged', castShadowsListener);
            castShadowsListener(false);
            state.resourceManager.refreshLitMaterials(state);
            
            return lightDesc;
        }

        function removeLightDesc(lightDesc, lights, shadowLights, globalVariables, state) {
            var light = lightDesc.light;
            var castShadowsListener = lightDesc.castShadowsListener;
            light.removeEventListener('castShadowsChanged', castShadowsListener);
            if (light.castShadows) {
                light.castShadows = false;
                lightDesc.lighting = true;
                castShadowsListener(false);
                light.castShadows = true;
            } else 
                removeLight(light, lights, globalVariables.lights);
                        
            state.resourceManager.refreshLitMaterials(state);
        }
        
        function addDirectionalLight(light, state) {
            return addLightDesc(light, state.dirLights, state.shadowDirLights, state.globalVariables.dirLights, state);
        }

        function addSpotLight(light, state) {
            return addLightDesc(light, state.spotLights, state.shadowSpotLights, state.globalVariables.spotLights, state);            
        }

        function addPointLight(light, state) {
            return addLightDesc(light, state.pointLights, state.shadowPointLights, state.globalVariables.pointLights, state);
        }
        
        function removeDirectionalLight(dev, lightDesc, state) {
            return removeLightDesc(lightDesc, state.dirLights, state.shadowDirLights, state.globalVariables.dirLights, state);
        }

        function removeSpotLight(dev, lightDesc, state) {
            return removeLightDesc(lightDesc, state.spotLights, state.shadowSpotLights, state.globalVariables.spotLights, state);
        }

        function removePointLight(dev, lightDesc, state) {
            return removeLightDesc(lightDesc, state.pointLights, state.shadowPointLights, state.globalVariables.pointLights, state);
        }

        function MeshRendererDesc(meshRenderer, state) {
            this.object = meshRenderer.object3D;
            this.valueOf = function(){
                return meshRenderer.ID;
            };
            this.meshRenderer = meshRenderer;
            this.dirSpotDepthMaterial = null;
            this.pointDepthMaterial = null;
            this.dirSpotSkinnedDepthMaterial = null;
            this.pointSkinnedDepthMaterial = null;

            var currLevelsCount = 0;
            var currBonesCount = 0;
            var _this = this;
            
            this.materialAddedListener = function (material) {
                initMat(material, state);
            };
            this.materialRemovedListener = function (material) {
                destroyMat(material, state);
            };
            this.levelAddedListener = function () {

                var levelsCount = meshRenderer.levelsCount;
                var bonesCount = meshRenderer.maxBonesCount;
                var influencesPerVertex = meshRenderer.minInfluencesPerVertex;
                var createSimple = false;

                for (var i = currLevelsCount; i < levelsCount; i++) {
                    var mesh = meshRenderer.getLevelMesh(i);
                    if (!(mesh instanceof Meshes.SkinnedMesh))                        
                        createSimple = true;
                }
                
                //init depth materials if not already done
                var depthMaterial;

                //for simple mesh
                if (createSimple && _this.dirSpotDepthMaterial == null) {

                    //directional and spot lights
                    depthMaterial = new Materials.DepthMaterial();
                    _this.dirSpotDepthMaterial = depthMaterial;
                    initMat(depthMaterial, state);

                    //point lights
                    depthMaterial = new Materials.DepthMaterial();
                    depthMaterial.defines += Programs.define(Programs.Defines.pointLightShadowMap, null, true);
                    _this.pointDepthMaterial = depthMaterial;
                    initMat(depthMaterial, state);
                }

                //for skinned meshes
                handleSkinnedDepthMaterials(_this, currBonesCount, bonesCount, influencesPerVertex, state);

                currLevelsCount = levelsCount;
                currBonesCount = bonesCount;

            };

            this.levelRemovedListener = function () {
                var levelsCount = meshRenderer.levelsCount;
                var bonesCount = meshRenderer.maxBonesCount;
                var influencesPerVertex = meshRenderer.minInfluencesPerVertex;

                if (_this.dirSpotDepthMaterial != null) {

                    var destroySimple = true;

                    for (var i = 0; i < levelsCount; i++) {
                        var mesh = meshRenderer.getLevelMesh(i);
                        if (!(mesh instanceof Meshes.SkinnedMesh))
                            destroySimple = false;
                    }
                    
                    if (destroySimple) {
                        destroyMat(_this.dirSpotDepthMaterial, state);
                        destroyMat(_this.pointDepthMaterial, state);
                        _this.dirSpotDepthMaterial = null;
                        _this.pointDepthMaterial = null;
                    }
                }                

                handleSkinnedDepthMaterials(_this, currBonesCount, bonesCount, influencesPerVertex, state);

                currLevelsCount = levelsCount;
                currBonesCount = bonesCount;
            };
        }

        function handleSkinnedDepthMaterials(meshRendererDesc, oldBonesCount, bonesCount, influencesPerVertex, state) {            
            if (oldBonesCount != bonesCount) {                
                if (oldBonesCount > 0)
                    destroySkinnedDepthMaterials(meshRendererDesc, state);
                if(bonesCount > 0)
                    buildSkinnedDepthMaterials(meshRendererDesc, bonesCount, influencesPerVertex, state);
            }            
        }
                
        function destroySkinnedDepthMaterials(meshRendererDesc, state) {
            destroyMat(meshRendererDesc.dirSpotSkinnedDepthMaterial, state);
            destroyMat(meshRendererDesc.pointSkinnedDepthMaterial, state);
            meshRendererDesc.dirSpotSkinnedDepthMaterial = null;
            meshRendererDesc.pointSkinnedDepthMaterial = null;
        }

        function buildSkinnedDepthMaterials(meshRendererDesc, bonesCount, influencesPerVertex, state) {
                                 
           var skinDefines =
                Programs.define(Programs.Defines.skinned, null, true) +
                Programs.define(Programs.Defines.influencesPerVertex, influencesPerVertex, true) +
                Programs.define(Programs.Defines.bonesCount, bonesCount, true);
                
            var depthMaterial;

            //directional and spot lights
            depthMaterial = new Materials.DepthMaterial();
            depthMaterial.defines += skinDefines;
            meshRendererDesc.dirSpotSkinnedDepthMaterial = depthMaterial;
            initMat(depthMaterial, state);

            //point lights
            depthMaterial = new Materials.DepthMaterial();
            depthMaterial.defines += skinDefines + Programs.define(Programs.Defines.pointLightShadowMap, null, true);
            meshRendererDesc.pointSkinnedDepthMaterial = depthMaterial;
            initMat(depthMaterial, state);
        }

        function addMeshRenderer(dev, meshRenderer, state) {
            var meshRendererDesc = new MeshRendererDesc(meshRenderer, state);
            var materialAddedListener = meshRendererDesc.materialAddedListener;
            var levelAddedListener = meshRendererDesc.levelAddedListener;
            var levelsCount = meshRenderer.levelsCount;
            for (var i = 0 ; i < levelsCount; i++) {
                levelAddedListener();
                var materialsCount = meshRenderer.getLevelMaterialsCount(i);
                for (var j = 0; j < materialsCount; j++)
                    materialAddedListener(meshRenderer.getLevelMaterial(i, j));
            }

            meshRenderer.addEventListener('materialAdded', materialAddedListener);
            meshRenderer.addEventListener('materialRemoved', meshRendererDesc.materialRemovedListener);
            meshRenderer.addEventListener('levelAdded', levelAddedListener);
            meshRenderer.addEventListener('levelRemoved', meshRendererDesc.levelRemovedListener);
            
            var renderLayers = meshRenderer.renderLayers;            
            var layersCount = renderLayers.length;
            var renderables = state.renderables;

            for (var i = 0 ; i < layersCount; i++) {
                var renderLayer = renderLayers[i];
                var layer = renderables[renderLayer];
                if (layer == null) {
                    layer = new Utils.SortedArray();
                    renderables[renderLayer] = layer;
                }
                layer.insert(meshRendererDesc);
            }
            
            return meshRendererDesc;
        }
       
       
        function removeMeshRenderer(dev, meshRendererDesc, state) {
            var meshRenderer = meshRendererDesc.meshRenderer;
            var materialRemovedListener = meshRendererDesc.materialRemovedListener;
            var levelRemovedListener = meshRendererDesc.levelRemovedListener;

            meshRenderer.removeEventListener('materialAdded', meshRendererDesc.materialAddedListener);
            meshRenderer.removeEventListener('materialRemoved', materialRemovedListener);
            meshRenderer.removeEventListener('levelAdded', meshRendererDesc.levelAddedListener);
            meshRenderer.removeEventListener('levelRemoved', levelRemovedListener);

            var levelsCount = meshRenderer.levelsCount;
            for (var i = 0 ; i < levelsCount; i++) {
                var materialsCount = meshRenderer.getLevelMaterialsCount(i);
                for (var j = 0; j < materialsCount; j++)
                    materialRemovedListener(meshRenderer.getLevelMaterial(i, j));
                levelRemovedListener();
            }
            
            var renderLayers = meshRenderer.renderLayers;            
            var layersCount = renderLayers.length;
            var renderables = state.renderables;

            for (var i = 0 ; i < layersCount; i++) {
                var renderLayer = renderLayers[i];
                var layer = renderables[renderLayer];

                if (layer.length > 1)
                    layer.remove(meshRendererDesc);
                else
                    renderables[renderLayer] = null;
            }
            
        }
              
        function getPostEffectGeometry(state) {
            return state.resourceManager.getPostEffectGeometry();            
        }

        function destroyPostEffectGeometry(geom, state) {
            state.resourceManager.destroyPostEffectGeometry();
        }

        function getSkyBoxGeometry(state) {
            return state.resourceManager.getSkyBoxGeometry();            
        }
        
        function destroySkyBoxGeometry(geom, state) {
            state.resourceManager.destroySkyBoxGeometry();
        }
        
        function getSkyBoxMaterial(state) {
            var mat = state.resourceManager.getSkyBoxMaterial(state);
            initMat(mat, state);
            return mat;
        }

        function destroySkyBoxMaterial(mat, state) {
            destroyMat(mat, state);
            state.resourceManager.destroySkyBoxMaterial();
        }
                
        function CameraDesc(dev, camera, castShadowsTest, getDepthMaterialFun, state) {
            this.camera = camera;            
            this.postRenderTarget = null;
            this.postRenderTarget1 = null;            
            this.postViewPort = null;
            this.castShadowsTest = castShadowsTest;
            this.getDepthMaterialFun = getDepthMaterialFun;
            this.postEffectGeometry = null;
            this.skyBoxGeometry = null;
            this.skyBoxMaterial = null;
            
            function resizeListener() {
                var width = dev.viewPortWidth;
                var height = dev.viewPortHeight;

                //at least one render target to update
                var postRenderTarget = _this.postRenderTarget;
                var colorTexture = postRenderTarget.colorTexture;
                colorTexture.width = width;
                colorTexture.height = height;
                postRenderTarget = _this.postRenderTarget1;
                if (postRenderTarget != null) {
                    colorTexture = postRenderTarget.colorTexture;
                    colorTexture.width = width;
                    colorTexture.height = height;
                }
            }

            function addResizeListener() {
                if (!resizeListenerAttached) {
                    dev.addEventListener('resize', resizeListener);
                    resizeListenerAttached = true;
                }                
            }

            function removeResizeListener() {
                if (resizeListenerAttached) {
                    dev.removeEventListener('resize', resizeListener);
                    resizeListenerAttached = false;
                }         
            }
            
            var resizeListenerAttached = false;
            var _this = this;

            this.postEffectAddedListener = function (material) {

                var count = camera.postEffectMaterialsCount;

                if (_this.postRenderTarget == null) {
                    var viewPort = _this.postViewPort;
                    var width;
                    var height;
                    if (viewPort == null) {
                        width = dev.viewPortWidth;
                        height = dev.viewPortHeight;
                        addResizeListener();
                    } else {
                        width = viewPort.width;
                        height = viewPort.height;
                    }

                    var colorTexture = Textures.createTexture(null, width, height);
                    _this.postRenderTarget = Textures.createRenderTarget(colorTexture);
                }

                if (count > 1 && _this.postRenderTarget1 == null) {
                    var colorTexture = _this.postRenderTarget.colorTexture.clone();
                    _this.postRenderTarget1 = Textures.createRenderTarget(colorTexture);
                }

                initMat(material, state);

                if (_this.postEffectGeometry == null)
                    _this.postEffectGeometry = getPostEffectGeometry(state);                                
            };

            this.postEffectRemovedListener = function (material) {

                destroyMat(material, state);
                var count = camera.postEffectMaterialsCount;

                //check if the second render target is still needed
                var postRenderTarget = _this.postRenderTarget1;
                if (count == 1 &&  postRenderTarget != null) {
                    postRenderTarget.release();
                    postRenderTarget.colorTexture.release();
                    _this.postRenderTarget1 = null;
                }
                if (count == 0) {
                    postRenderTarget = _this.postRenderTarget;
                    postRenderTarget.release();
                    postRenderTarget.colorTexture.release();
                    _this.postRenderTarget = null;

                    if (_this.postViewPort == null)
                        removeResizeListener();                        

                    destroyPostEffectGeometry(_this.postEffectGeometry, state);
                    _this.postEffectGeometry = null;
                }
            };

            this.renderTargetChangedListener = function () {
                var count = camera.postEffectMaterialsCount;                
                for (var i = 0 ; i < count; i++)
                    _this.postEffectRemovedListener(camera.getPostEffectMaterial(i));
                for (var i = 0 ; i < count; i++)
                    _this.postEffectAddedListener(camera.getPostEffectMaterial(i));
            };

            this.viewPortChangedListener = function () {
                var viewPort = camera.viewPort;
                var currViewPort = _this.postViewPort;                
                var attachResizeListener = false;
                var detachResizeListener = false;

                if (currViewPort == viewPort)
                    return;
                
                if (currViewPort == null) {
                    //viewPort != null
                    var width = viewPort.width;
                    var height = viewPort.height;                    
                    detachResizeListener = true;                    
                } else {

                    if (viewPort == null) {
                        var width = dev.viewPortWidth;
                        var height = dev.viewPortHeight;
                        attachResizeListener = true;
                    } else {
                        var width = viewPort.width;
                        var height = viewPort.height;                        
                    }

                    currViewPort.release();
                }

                if (viewPort != null)
                    _this.postViewPort = Rectangles.createViewPort(width, height, 0, 0);
                else             
                    _this.postViewPort = null;

                var renderTarget = _this.postRenderTarget;
                if (renderTarget != null) {
                    var colorTexture = renderTarget.colorTexture;
                    colorTexture.width = width;
                    colorTexture.height = height;                                        
                    var renderTarget1 = _this.postRenderTarget1;
                    if (renderTarget1 != null) {
                        colorTexture = renderTarget1.colorTexture;
                        colorTexture.width = width;
                        colorTexture.height = height;
                    }

                    if (attachResizeListener)
                        addResizeListener();                    
                    else if (detachResizeListener) 
                        removeResizeListener();
                }
            };

            this.skyBoxChangedListener = function () {
                var hasSkyBox = camera.skyBox != null;
                var skyBoxGeometry = _this.skyBoxGeometry;

                if (hasSkyBox && skyBoxGeometry == null) {
                    _this.skyBoxGeometry = getSkyBoxGeometry(state);
                    _this.skyBoxMaterial = getSkyBoxMaterial(state);
                }
                else if (!hasSkyBox && skyBoxGeometry != null) {
                    destroySkyBoxGeometry(skyBoxGeometry, state);
                    _this.skyBoxGeometry = null;
                    destroySkyBoxMaterial(_this.skyBoxMaterial, state);
                    _this.skyBoxMaterial = null;
                }
            };
        }

        function addCamera(dev, camera, lightCamera, state) {

            var cameras = state.cameras;
                                    
            var castShadowsTest = false;
            var getDepthMaterialFun = null;
            if (lightCamera === 1) {
                castShadowsTest = true;                
                getDepthMaterialFun = getDirSpotShadowMaterial;
            } else if (lightCamera === 2) {
                castShadowsTest = true;
                getDepthMaterialFun = getPointShadowMaterial;
            }

            var cameraDesc = new CameraDesc(dev, camera, castShadowsTest, getDepthMaterialFun, state);
            var viewPortChangedListener = cameraDesc.viewPortChangedListener;
            var postEffectAddedListener = cameraDesc.postEffectAddedListener;
            var skyBoxChangedListener = cameraDesc.skyBoxChangedListener;
            
            viewPortChangedListener();

            var postEffectMaterialsCount = camera.postEffectMaterialsCount;

            if (postEffectMaterialsCount > 0)                 
                for (var k = 0 ; k < postEffectMaterialsCount; k++)
                    postEffectAddedListener(camera.getPostEffectMaterial(k));
            
            skyBoxChangedListener();

            camera.addEventListener('viewPortChanged', viewPortChangedListener);
            camera.addEventListener('postEffectMaterialAdded', postEffectAddedListener);
            camera.addEventListener('postEffectMaterialRemoved', cameraDesc.postEffectRemovedListener);
            camera.addEventListener('renderTargetChanged', cameraDesc.renderTargetChangedListener);
            camera.addEventListener('skyBoxChanged', skyBoxChangedListener);

            var renderOrder = camera.renderOrder;
            var camerasCount = cameras.length;
            var i;

            for (i = 0; i < camerasCount; i++)
                if (cameras[i].camera.renderOrder > renderOrder)
                    break;
            
            cameras.splice(i, 0, cameraDesc);

            return cameraDesc;
        }

        function removeCamera(dev, cameraDesc, state){
            var camera = cameraDesc.camera;
            var postEffectMaterialsCount = camera.postEffectMaterialsCount;
            var postEffectRemovedListener = cameraDesc.postEffectRemovedListener;
            var skyBoxChangedListener = cameraDesc.skyBoxChangedListener;

            camera.removeEventListener('skyBoxChanged', skyBoxChangedListener);
            camera.removeEventListener('renderTargetChanged', cameraDesc.renderTargetChangedListener);
            camera.removeEventListener('postEffectMaterialAdded', cameraDesc.postEffectAddedListener);
            camera.removeEventListener('postEffectMaterialRemoved', postEffectRemovedListener);
            camera.removeEventListener('viewPortChanged', cameraDesc.viewPortChangedListener);

            var i;
            for (i = 0 ; i < postEffectMaterialsCount; i++)
                postEffectRemovedListener(camera.getPostEffectMaterial(i));
                                    
            var skyBox = camera.skyBox;
            if (skyBox != null) {
                camera.skyBox = null;
                skyBoxChangedListener();
                camera.skyBox = skyBox;
            }                
            
            var cameras = state.cameras;
            cameras.splice(cameras.indexOf(cameraDesc), 1);
        }

        function getDirSpotShadowMaterial(mesh, meshRendererDesc) {

            if (mesh instanceof Meshes.SkinnedMesh)
                return meshRendererDesc.dirSpotSkinnedDepthMaterial;
            else
                return meshRendererDesc.dirSpotDepthMaterial;
        }

        function getPointShadowMaterial(mesh, meshRendererDesc) {

            if (mesh instanceof Meshes.SkinnedMesh)
                return meshRendererDesc.pointSkinnedDepthMaterial;
            else
                return meshRendererDesc.pointDepthMaterial;
        }
        
        function createRendererVariables(state) {
            var rendererVariables = state.rendererVariables;
            var sceneVariables = (rendererVariables.sceneVariables = {});

            var names = Programs.Names.uniforms;

            sceneVariables[names.directionalLights] =     {
                ctor: new RendererVariables.DirectionalLightsRendererVariable(state.dirLights),
                global: state.globalVariables.dirLights.lights
            };

            sceneVariables[names.spotLights] = {
                ctor: new RendererVariables.SpotLightsRendererVariable(state.spotLights),
                global : state.globalVariables.spotLights.lights
            };
            
            sceneVariables[names.shadowDirectionalLights] = {
                ctor: new RendererVariables.DirectionalLightsRendererVariable(state.shadowDirLights),
                global: state.globalVariables.dirLights.shadows.shadowLights
            };
            
            sceneVariables[names.shadowSpotLights] = {
                ctor: new RendererVariables.SpotLightsRendererVariable(state.shadowSpotLights),
                global: state.globalVariables.spotLights.shadows.shadowLights
            };

            sceneVariables[names.dirShadowTransforms] = {
                ctor: new RendererVariables.DirSpotShadowTransformsRendererVariable(state.shadowDirLights),
                global: state.globalVariables.dirLights.shadows.shadowTransforms
            };

            sceneVariables[names.dirShadowMaps] = {
                ctor: new RendererVariables.ShadowMapsRendererVariable(state.shadowDirLights),
                global: state.globalVariables.dirLights.shadows.shadowMaps
            };
            
            sceneVariables[names.dirShadowMapSizeAndBias] = {
                ctor: new RendererVariables.DirSpotShadowMapsSizeAndBiasRendererVariable(state.shadowDirLights),
                global : state.globalVariables.dirLights.shadows.shadowMapsSizeAndBias
            };
            
            sceneVariables[names.spotShadowTransforms] = {
                ctor: new RendererVariables.DirSpotShadowTransformsRendererVariable(state.shadowSpotLights),
                global: state.globalVariables.spotLights.shadows.shadowTransforms
            };

            sceneVariables[names.spotShadowMaps] = {
                ctor: new RendererVariables.ShadowMapsRendererVariable(state.shadowSpotLights),
                global: state.globalVariables.spotLights.shadows.shadowMaps
            };

            sceneVariables[names.spotShadowMapSizeAndBias] = {
                ctor: new RendererVariables.DirSpotShadowMapsSizeAndBiasRendererVariable(state.shadowSpotLights),
                global: state.globalVariables.spotLights.shadows.shadowMapsSizeAndBias
            };

            sceneVariables[names.pointLights] = {
                ctor: new RendererVariables.PointLightsRendererVariable(state.pointLights),
                global: state.globalVariables.pointLights.lights
            };

            sceneVariables[names.shadowPointLights] = {
                ctor: new RendererVariables.PointLightsRendererVariable(state.shadowPointLights),
                global: state.globalVariables.pointLights.shadows.shadowLights
            };

            sceneVariables[names.pointShadowMaps] = {
                ctor: new RendererVariables.ShadowMapsRendererVariable(state.shadowPointLights),
                global: state.globalVariables.pointLights.shadows.shadowMaps
            };

            sceneVariables[names.pointPositionAndBiases] = {
                ctor: new RendererVariables.PointPositionAndBiasesRendererVariable(state.shadowPointLights),
                global : state.globalVariables.pointLights.shadows.positionAndBiases
            };
            
            sceneVariables[names.ambientLight] = {
                ctor: new RendererVariables.AmbientLightVariable(state.currScene),
                global : state.globalVariables.ambientLight
            };

            sceneVariables[names.fogColor] = {
                ctor: new RendererVariables.FogColorVariable(state.currScene),
                global: state.globalVariables.fogColor
            };

            sceneVariables[names.fogStartDistanceAndRange] = {
                ctor: new RendererVariables.FogStartDistanceAndRangeVariable(state.currScene),
                global: state.globalVariables.fogStartDistanceAndRange
            };

            sceneVariables[names.invSquaredSceneSize] = {
                ctor: new RendererVariables.InvSquaredSceneSizeVariable(state.currScene),
                global: state.globalVariables.invSquaredSceneSize
            };
             
            var cameraVariables = (rendererVariables.cameraVariables = {});            
            cameraVariables[names.eyePosition] = {
                ctor: RendererVariables.EyePositionVariable,
                global : state.globalVariables.eyePosition
            };

            cameraVariables[names.projectionView] = {
                ctor: RendererVariables.ProjViewVariable,
                global: state.globalVariables.projectionView
            };

            cameraVariables[names.projection] = {
                ctor: RendererVariables.ProjectionVariable,
                global : state.globalVariables.projection
            };

            cameraVariables[names.viewTransform] = {
                ctor: RendererVariables.ViewVariable,
                global: state.globalVariables.view
            };
                                                
            var objectVariables = (rendererVariables.objectVariables = {});
            objectVariables[names.worldTransform] = {
                ctor: RendererVariables.WorldVariable
            };
            objectVariables[names.worldInvTranspose] = {
                ctor: RendererVariables.WorldInvTransposeVariable
            };
            objectVariables[names.projectionViewWorld] = {
                ctor: RendererVariables.ProjViewWorldVariable
            };

            objectVariables[names.bonesTransforms] = {
                ctor: RendererVariables.BonesTransformsVariable
            };
            objectVariables[names.bonesInvTransposes] = {
                ctor: RendererVariables.BonesInvTransposesVariable
            };
        }
        
        function initMat(material, state) {        
            var materialDesc = state.resourceManager.initMat(material, state);
            if (materialDesc == null)
                return;
            state.materials[material.ID] = materialDesc;            
        }

        function destroyMat(material, state) {
            if (!state.resourceManager.destroyMat(material))
                return;

            var materialID = material.ID;
            var materialDesc = state.materials[materialID];
            state.materials[materialID] = null;                        
        }

        function setMat(dev, material, state, materialDesc) {

            if (materialDesc == null) {
                var materialID = material.ID;
                var materials = state.materials;
                materialDesc = materials[materialID];
            }
            var programDesc = materialDesc.programDesc;
            var program = programDesc.program;
            
            dev.setProgram(program);
            
            setSceneProgramVariables(programDesc, state);
            setFrameProgramVariables(programDesc, state);
                        
            var currMaterial = programDesc.currMaterial;
            var force = false;

            if (currMaterial != material) {
                force = true;
                programDesc.currMaterial = material;                
            }

            dev.setBlendState(material.blendState);
            dev.setCullState(material.cullState);
            dev.setDepthState(material.depthState);
            setMaterialProgramVariables(materialDesc, force, state);
        }

        function setMaterialProgramVariables(materialDesc, force, state) {            
            var materialVariables = materialDesc.customVariables;            
            for (var i = 0, count = materialVariables.length; i < count; i++)
                materialVariables[i].setFun(force);
            state.perObjectUpdate = materialDesc.objectVariables;
        }

        function setSceneProgramVariables(programDesc, state) {
            var rendererVariables = programDesc.sceneVariables;
            for (var i = 0, count = rendererVariables.length; i < count ; i++)
                rendererVariables[i].setFun();
        }

        function setFrameProgramVariables(programDesc, state) {
            var rendererVariables = programDesc.cameraVariables;
            for (var i = 0, count = rendererVariables.length; i < count ; i++)
                rendererVariables[i].setFun(state);
        }
        
        
        RenderSystem.prototype = Object.create(System.prototype);
        Object.defineProperty(RenderSystem.prototype, 'constructor', { value: RenderSystem });
                
        return RenderSystem;
    });