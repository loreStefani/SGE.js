define(['engine/Object3D', 'core/VMath', './Meshes', './Programs'], function (Object3D, VMath, Meshes, Programs) {

    'use strict';

    var Component = Object3D.Component;
    var ComponentType = Object3D.ComponentType;
    
    var levelAddedEvent = 'levelAdded';
    var levelRemovedEvent = 'levelRemoved';
    var materialAddedEvent = 'materialAdded';
    var materialRemovedEvent = 'materialRemoved';
    
    function MeshRenderer(mesh, materials, maxDistance, castShadows, renderLayers) {

        Component.call(this);

        maxDistance = maxDistance != null ? maxDistance : 1500.0;
        castShadows = castShadows != null ? castShadows : true;
        if (renderLayers != null) {            
            var a = [];            
            if (renderLayers instanceof Array) {
                var count = renderLayers.length;
                for (var i = 0; i < count; i++)
                    a.push(renderLayers[i]);
            } else
                a[0] = renderLayers;
            renderLayers = a;
        } else
            renderLayers = [0];
        
        var meshes = [];
        var distances = [];
        var perLevelMaterials = [];        
        var levelsCount = 0;
        var currLevel = -1;
        var maxBonesCount = 0;
        var minInfluencesPerVertex = 4;
        
        Object.defineProperties(this, {

            onActivated: {
                value: function () {
                }
            },

            onDeactivated: {
                value: function () {
                }
            },

            castShadows: {
                get: function () {
                    return castShadows;
                },
                set: function (v) {
                    castShadows = v;
                }
            },

            renderLayers : {
                value : renderLayers
            },

            addLevel: {

                value: function (maxDistance, mesh, materials) {

                    if (mesh == null)
                        throw new Error('invalid parameter');

                    if (currLevel == -1)
                        currLevel = 0;

                    //keep squared lengths
                    maxDistance = maxDistance != null ? maxDistance * maxDistance : 0;

                    for (var i = 0; i < levelsCount; i++) {
                        var distance = distances[i];
                        if (distance > maxDistance)
                            break;
                    }

                    //insert level
                    levelsCount++;
                    meshes.splice(i, 0, mesh);
                    distances.splice(i, 0, maxDistance);
                    perLevelMaterials.splice(i, 0, []);

                    if (mesh instanceof Meshes.SkinnedMesh) {
                        maxBonesCount = Math.max(maxBonesCount, mesh.influences.length);
                        minInfluencesPerVertex = Math.min(minInfluencesPerVertex, mesh.influencesPerVertex);
                    }

                    if (materials != null)
                        this.addLevelMaterials(i, materials);

                    this.trigger(levelAddedEvent);

                    return i;
                }
            },

            removeLevel: {
                value: function (level) {                    
                    var mesh = meshes.splice(level, 1)[0];

                    distances.splice(level, 1);
                    var levelMaterials = perLevelMaterials[level];
                    this.removeLevelMaterials(level);
                    perLevelMaterials.splice(level, 1);
                    levelsCount--;
                    if (levelsCount == 0)
                        currLevel = -1;

                    if (mesh instanceof Meshes.SkinnedMesh) {
                        
                        var update = false;

                        if (mesh.influences.length >= maxBonesCount) {
                            maxBonesCount = 0;
                            update = true;
                        }

                        if (mesh.influencesPerVertex <= minInfluencesPerVertex) {
                            minInfluencesPerVertex = 4;
                            update = true;
                        }

                        if(update)
                            for (var i = 0; i < levelsCount; i++) {
                                mesh = meshes[i];
                                if (mesh instanceof Meshes.SkinnedMesh)
                                    maxBonesCount = Math.max(maxBonesCount, mesh.influences.length);
                                minInfluencesPerVertex = Math.min(minInfluencesPerVertex, mesh.influencesPerVertex)
                            }                        
                    }
                    
                    this.trigger(levelRemovedEvent);
                }
            },

            levelsCount: {
                get: function () {
                    return levelsCount;
                }
            },

            maxBonesCount : {
                get: function () {
                    return maxBonesCount;
                }
            },
            
            minInfluencesPerVertex : {
                get: function () {
                    return minInfluencesPerVertex;
                }
            },            

            getLevelDistance : {
                value: function (level) {                    
                    return Math.sqrt(distances[level]);
                }
            },

            addLevelMaterials: {
                value: function (level, material) {                    
                    var levelMaterials = perLevelMaterials[level];

                    if (!(material instanceof Array))
                        material = [material];

                    var mesh = meshes[level];

                    var additionalDefines = '';
                    if (mesh instanceof Meshes.SkinnedMesh)
                        additionalDefines =
                            Programs.define(Programs.Defines.skinned, null, true) +
                            Programs.define(Programs.Defines.influencesPerVertex, mesh.influencesPerVertex, true) +
                            Programs.define(Programs.Defines.bonesCount, mesh.influences.length, true);
                            
                    var count = material.length;
                    for (var i = 0; i < count; i++) {
                        var mat = material[i];
                        mat.defines += additionalDefines;
                        levelMaterials.push(mat);
                        this.trigger(materialAddedEvent, mat);
                    }
                }
            },

            removeLevelMaterial: {
                value: function (level, material) {                    
                    var levelMaterials = perLevelMaterials[level];

                    var materialIndex = levelMaterials.indexOf(material);
                    if (materialIndex == -1)
                        return;

                    levelMaterials.splice(materialIndex, 1);
                    this.trigger(materialRemovedEvent, material);                    
                }
            },

            removeLevelMaterialByIndex : {
                value: function (level, materialIndex) {                    
                    var levelMaterials = perLevelMaterials[level];                    
                    var material = levelMaterials[materialIndex];
                    levelMaterials.splice(materialIndex, 1);
                    this.trigger(materialRemovedEvent, material);
                }
            },

            removeLevelMaterials: {
                value: function (level) {                    
                    var levelMaterials = perLevelMaterials[level];
                    perLevelMaterials[level] = [];
                    var count = levelMaterials.length;
                    for (var i = 0; i < count; i++)
                        this.trigger(materialRemovedEvent, levelMaterials[i]);
                }
            },

            getLevelMaterials : {
                value : function(level){                    
                    return perLevelMaterials[level];
                }
            },

            getLevelMaterialsCount: {
                value: function (level) {                    
                    return perLevelMaterials[level].length;
                }
            },

            getLevelMaterial: {
                value: function (level, materialIndex) {                    
                    return perLevelMaterials[level][materialIndex];
                }
            },

            getLevelMesh: {
                value: function (level) {                    
                    return meshes[level];
                }
            },           

            getLevelByTransform: {
                value: (function () {

                    var v = new VMath.Vector3();

                    return function (transformComponent) {

                        //faster if only one level
                        if (levelsCount == 1)
                            return 0;

                        var worldPt = transformComponent.worldPosition;
                        var worldPos = this.object3D.transformComponent.worldPosition;

                        v.fromVector3(worldPt);
                        v.substract(worldPos);

                        var targetDistance = v.squaredLength();                        
                        for (var i = 0 ; i < levelsCount - 1; i++) {
                            var distance = distances[i];
                            if (targetDistance <= distance)
                                break;
                        }

                        return i;
                    };

                })()
            },
                        
            setLevel : {
                value: function (level) {                    
                    currLevel = level;
                }
            },

            setLevelByTransform : {
                value: function (transformComponent) {
                    this.setLevel(this.getLevelByTransform(transformComponent));                    
                }
            },
                        
            getMesh : {
                value: function () {
                    return this.getLevelMesh(currLevel);
                }
            },

            getMaterialsCount : {
                value: function () {
                    return this.getLevelMaterialsCount(currLevel);
                }
            },

            getMaterial : {
                value: function (i) {
                    return this.getLevelMaterial(currLevel, i);
                }
            },
            
            addMaterial: {
                value: function (mat) {
                    this.addLevelMaterials(currLevel, mat);
                }
            },

            removeMaterial: {
                value: function (mat) {
                    this.removeLevelMaterial(currLevel, mat);
                }
            },

            removeMaterialByIndex: {
                value: function (i) {
                    this.removeLevelMaterialByIndex(currLevel, i);
                }
            }
        });

        if (mesh != null) {
            this.addLevel(maxDistance, mesh, materials);
        }
    }
        
    MeshRenderer.prototype = Object.create(Component.prototype);
    Object.defineProperties(MeshRenderer.prototype, {

        constructor: { value: MeshRenderer },

        componentType: {
            value: ComponentType.MeshRenderer
        },

        clone: {
            value: function () {
                var component = new MeshRenderer(null, null, null, this.castShadows, this.renderLayers);
                
                var levelsCount = this.levelsCount;
                for (var i = 0 ; i < levelsCount; i++) 
                    component.addLevel(this.getLevelDistance(i), this.getLevelMesh(i), this.getLevelMaterials(i));
                
                return component;
            }
        }

    });


    return MeshRenderer;        
});