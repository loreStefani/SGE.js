define(['core/EventTarget', 'core/VMath', './Object3D'], function (EventTarget, VMath, Object3D) {

    'use strict';

    var ComponentType = Object3D.ComponentType;

    var ambientLightChangedEvent = 'ambientLightChanged';
    var fogColorChangedEvent = 'fogColorChanged';
    var fogStartDistanceChangedEvent = 'fogStartDistanceChanged';
    var fogRangeChangedEvent = 'fogRangeChanged';
    var sceneSizeChangedEvent = 'sceneSizeChanged';
        
    function AddDesc(component, system) {
        this.component = component;
        this.system = system;
    }

    function ObjectDesc(object3D, components, addedComponentListener, removedComponentListener) {
        this.object3D = object3D;
        this.components = components;
        this.addedComponentListener = addedComponentListener;
        this.removedComponentListener = removedComponentListener;
    }

    function Scene(systems) {
        
        EventTarget.call(this);
                
        var objectsMap = {};
        
        var ambientLight = new VMath.Vector4(0.3, 0.3, 0.3, 1.0);
        var fogColor = new VMath.Vector4(0.2,0.2,0.2,1.0);
        var fogStartDistance = 200.0;
        var fogRange = 300.0;
        var sceneSize = 100.0;
        var invSquaredSceneSize = 1.0 / (sceneSize*sceneSize);
                
        var childAddedListener = createChildAddedListener(this);
        var childRemovedListener = createChildRemovedListener(this);

        for (var system in systems)
            systems[system].setScene(this);

        Object.defineProperties(this, {
            
            add: {
                value: function (object3D) {

                    var object3DID = object3D.ID;
                    var objectDesc = objectsMap[object3DID];

                    if (objectDesc != null)
                        return;

                    var objectComponents = {};

                    var addedListener = addedComponentListener(object3D, systems, objectComponents);

                    for (var key in ComponentType) {
                        var type = ComponentType[key];                        
                        var count = object3D.perTypeComponentsCount(type);
                        for (var i = 0 ; i < count; i++)
                            addedListener(object3D.getComponent(type, i));
                    }
                    
                    object3D.addEventListener('componentAdded', addedListener);
                    var removedListener = removedComponentListener(object3D, objectComponents);
                    object3D.addEventListener('componentRemoved', removedListener);

                    objectDesc = new ObjectDesc(object3D, objectComponents, addedListener, removedListener);
                    objectsMap[object3DID] = objectDesc;

                    var transformComponent = object3D.transformComponent;
                    transformComponent.addEventListener('childAdded', childAddedListener);
                    transformComponent.addEventListener('childRemoved', childRemovedListener);
                    addHierachy(this, transformComponent);
                }
            },

            remove: {
                value: function (object3D) {

                    var object3DID = object3D.ID;
                    var objectDesc = objectsMap[object3DID];

                    if (objectDesc == null)
                        return;
                    
                    var objectComponents = objectDesc.components;
                    object3D.removeEventListener('componentRemoved', objectDesc.removedComponentListener);
                    object3D.removeEventListener('componentAdded', objectDesc.addedComponentListener);
                    
                    for (var ID in objectComponents)
                        removeComponentFromSystem(ID, objectComponents);

                    objectsMap[object3DID] = null;
                    
                    var transformComponent = object3D.transformComponent;
                    transformComponent.removeEventListener('childAdded', childAddedListener);
                    transformComponent.removeEventListener('childRemoved', childRemovedListener);
                    removeHierarchy(this, transformComponent);
                }
            },

            release: {
                value: function () {

                    for (var key in objectsMap) {
                        var objectDesc = objectsMap[key];
                        if (objectDesc == null)
                            continue;
                        this.remove(objectDesc.object3D);
                    }

                    for (var system in systems)
                        systems[system].setScene(null);

                    systems = null;
                }
            },

            ambientLight : {
                get: function () {
                    return ambientLight;
                },
                set: function (v) {
                    ambientLight.fromVector4(v);
                    this.trigger(ambientLightChangedEvent);
                }
            },

            fogColor : {
                get: function () {
                    return fogColor;
                },
                set: function (v) {
                    if(v != fogColor)
                        fogColor.fromVector4(v);
                    this.trigger(fogColorChangedEvent);
                }
            },

            fogStartDistance : {
                get: function () {
                    return fogStartDistance;
                },
                set: function (v) {
                    fogStartDistance = v;
                    this.trigger(fogStartDistanceChangedEvent);
                }
            },

            fogRange : {
                get: function () {
                    return fogRange;
                },
                set: function (v) {
                    fogRange = v;
                    this.trigger(fogRangeChangedEvent);
                }
            },

            fogStartDistanceAndRange : {
                get: (function () {
                    var value = new VMath.Vector2();
                    return function () {
                        value.set(fogStartDistance, fogRange);
                        return value;
                    };

                })()
            },

            sceneSize : {
                get: function () {
                    return sceneSize;
                },
                set: function (v) {
                    sceneSize = v;
                    invSquaredSceneSize = 1.0 / (sceneSize * sceneSize);
                    this.trigger(sceneSizeChangedEvent);
                }
            },

            invSquaredSceneSize : {
                get: function () {
                    return invSquaredSceneSize;
                }
            }

        });
    }

    function addedComponentListener(object3D, systems, objectComponents) {
        return function (component) {

            var type = component.componentType;

            var system = systems.renderSystem;
            switch (type) {
                case ComponentType.Light:
                case ComponentType.Camera:
                case ComponentType.MeshRenderer:
                    break;
                case ComponentType.Animator:
                    system = systems.animationSystem;
                    break;
                case ComponentType.Behavior:
                    system = systems.behaviorSystem;
                    break;
                default:
                    return;
            }

            addComponentToSystem(system, component, objectComponents);
        };
    }
    
    function addComponentToSystem(system, component, objectComponents) {
        system.addComponent(component);
        objectComponents[component.ID] = new AddDesc(component, system);
    }

    function removeComponentFromSystem(componentID, objectComponents) {                
        var addDesc = objectComponents[componentID];
        if (addDesc == null)
            return;
        objectComponents[componentID] = null;
        addDesc.system.removeComponent(addDesc.component);
    }

    function removedComponentListener(object3D, objectComponents) {
        return function (component) {
            removeComponentFromSystem(component.ID, objectComponents);
        };
    }

    function createChildAddedListener(scene) {
        return function (transformComponent) {
            scene.add(transformComponent.object3D);
        };
    }
    function createChildRemovedListener(scene) {
        return function (transformComponent) {
            scene.remove(transformComponent.object3D);
        };
    }
    
    function addHierachy(scene, transformComponent) {        

        var childCount = transformComponent.childCount;
        for (var i = 0; i < childCount; i++) {
            var child = transformComponent.getChild(i).object3D;            
            scene.add(child);
        }        
    }

    function removeHierarchy(scene, transformComponent) {        
        
        var childCount = transformComponent.childCount;
        for (var i = 0; i < childCount; i++) {
            var child = transformComponent.getChild(i).object3D;            
            scene.remove(child);
        }
    }

    Scene.prototype = Object.create(EventTarget.prototype);
    Object.defineProperty(Scene.prototype, 'constructor', { value: Scene });

    return Scene;
});