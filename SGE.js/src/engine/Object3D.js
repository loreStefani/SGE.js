define(['require', 'core/EventTarget'], function (require, EventTarget) {
    
    'use strict';
    var componentAddedEvent = 'componentAdded';
    var componentRemovedEvent = 'componentRemoved';

    var perComponentObject = {};

    function Component() {

        EventTarget.call(this);

        var object3D;

        Object.defineProperties(this, {

            object3D: {
                get: function () {
                    return perComponentObject[this.ID];
                }
            }
        });
    }

    Component.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(Component.prototype, {

        constructor: { value: Component },

        onActivated : {
            value : function(){
            }            
        },

        onDeactivated : {
            value: function () {
            }
        }        
    });

    var ComponentType = Object.freeze({
        Transform: 0,
        Camera: 1,
        Light: 2,
        MeshRenderer: 3,
        Animator: 4,
        Skeleton: 5,
        Behavior: 6
    });

    var MaxComponentsCount = Object.freeze({
        Transform: 1,
        Camera: 1,
        Light: 1,
        MeshRenderer: 1,
        Animator: 1,
        Skeleton: 1,
        Behavior: Number.POSITIVE_INFINITY
    });

    var MinComponentsCount = Object.freeze({
        Transform: 1,
        Camera: 0,
        Light: 0,
        MeshRenderer: 0,
        Animator: 0,
        Skeleton: 0,
        Behavior: 0
    });

    function Object3D(parent) {

        EventTarget.call(this);

        var perTypeComponents = {};
        for (var type in ComponentType)
            perTypeComponents[ComponentType[type]] = [];

        var transformComponent = new (require('./TransformComponent'))();
                
        Object.defineProperties(this, {

            transformComponent: {
                get: function () {
                    return transformComponent;
                }
            },
                        
            addComponent: {
                value: function (component) {
                    
                    //if the component has been added to another object, remove from it
                    var componentID = component.ID;
                    var componentObject = perComponentObject[componentID];
                    if (componentObject == this)
                        return;
                    else if (componentObject != null)
                        componentObject.removeComponent(component);

                    //access components by type
                    var componentType = component.componentType;
                    var components = perTypeComponents[componentType];
                    //check per-type max components count, replace older if needed
                    if (components.length == MaxComponentsCount[componentType])
                        this.removeComponent(components[0]);
                                       
                    //add the component
                    components.push(component);                    
                    perComponentObject[componentID] = this;
                    component.onActivated();
                    this.trigger(componentAddedEvent, component);
                }
            },

            removeComponent: {
                value: function (component) {

                    var componentID = component.ID;
                    var componentObject = perComponentObject[componentID];
                    if (componentObject == null || componentObject == this)
                        return;
                                                                                
                    var componentType = component.componentType;
                    var components = perTypeComponents[componentType];
                    
                    //check per-type min components count
                    if(components.length == MinComponentsCount[componentType])
                        throw new Error('can\'t remove component');
                       
                    component.onDeactivated();
                    perComponentObject[componentID] = null;
                    components.splice(components.indexOf(component), 1);
                    this.trigger(componentRemovedEvent, component);
                }
            },

            getComponent: {
                value: function (type, i) {
                    i = i != null ? i : 0;
                    return perTypeComponents[type][i];
                }
            },

            perTypeComponentsCount : {
                value: function (type) {
                    return perTypeComponents[type].length;
                }
            }
            
        });

        this.addComponent(transformComponent);
        if (parent != null)
            parent.transformComponent.addChild(transformComponent);
    }

    Object3D.prototype = Object.create(EventTarget.prototype);
    Object.defineProperty(Object3D.prototype, 'constructor', { value: Object3D });

    return Object.freeze({
        Object3D: Object3D,
        Component: Component,
        ComponentType : ComponentType
    });
});
