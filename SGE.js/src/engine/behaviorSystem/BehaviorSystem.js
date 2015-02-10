define(['engine/System', 'Utils'], function (System, Utils) {

    function BehaviorSystem() {

        System.call(this);

        //keep components sorted so it's faster removing them
        var components = new Utils.SortedArray();        
        var updateList = [];

        Object.defineProperties(this, {

            addComponent : {
                value: function (component) {
                    if (components.indexOf(component) != -1)
                        return;
                    components.insert(component);                                 
                }
            },

            removeComponent : {
                value: function (component) {                    
                    if (components.remove(component) != -1)
                        //refresh updateList to avoid keep references to removed components
                        Utils.emptyArray(updateList);
                }
            },
                        
            update: {
                value: function (dt) {
                    var count = components.length;
                    for (var i = 0; i < count; i++)
                        updateList[i] = components.get(i);
                    //use updateList because components can remove or add ohter components or themselves...
                    for (var i = 0; i < count; i++) 
                        updateList[i].update(dt);
                }
            }

        });
    }

    BehaviorSystem.prototype = Object.create(System.prototype);
    Object.defineProperty(BehaviorSystem.prototype, 'constructor', {value : BehaviorSystem});

    return BehaviorSystem;
});