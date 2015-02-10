define(['engine/System', 'Utils', 'engine/Object3D'], function (System, Utils, Object3D) {

    'use strict';

    function AnimationSystem() {

        System.call(this);
        
        //keep components sorted so it's faster removing them
        var animatorComponents = new Utils.SortedArray();

        Object.defineProperties(this, {

            addComponent : {
                value: function (component) {
                    if (animatorComponents.indexOf(component) != -1)
                        return;
                    animatorComponents.insert(component);                    
                }
            },

            removeComponent : {
                value: function (component) {                    
                    animatorComponents.remove(component);                    
                }
            },
            
            update: {
                value: function (dt) {
                    for (var i = 0, count = animatorComponents.length ; i < count; i++) 
                        animatorComponents.get(i).update(dt);
                }
            }
        });
    }
    
    AnimationSystem.prototype = Object.create(System.prototype);
    Object.defineProperty(AnimationSystem.prototype, 'constructor', { value: AnimationSystem });

    return AnimationSystem;
});