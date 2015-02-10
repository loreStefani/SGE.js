define(['engine/Object3D'], function (Object3D) {
    
    var Component = Object3D.Component;
    var ComponentType = Object3D.ComponentType;

    function BehaviorComponent() {
        Component.call(this);                
    }

    BehaviorComponent.prototype = Object.create(Component.prototype);
    Object.defineProperties(BehaviorComponent.prototype, {
        
        constructor : { value: BehaviorComponent },

        componentType : {
            value : ComponentType.Behavior
        },

        update: {
            value: function (dt) {
            }
        }
    });

    return BehaviorComponent;
});