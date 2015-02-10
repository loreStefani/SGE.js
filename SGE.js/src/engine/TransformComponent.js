define(['core/VMath', './Object3D'], function (VMath, Object3D) {

    'use strict';

    var Component = Object3D.Component;
    var ComponentType = Object3D.ComponentType;

    var positionChangedEvent = 'positionChanged';
    var quaternionChangedEvent = 'quaternionChanged';
    var scaleChangedEvent = 'scaleChanged';
    var transformChangedEvent = 'transformChanged';
    var parentChangedEvent = 'parentChanged';
    var childAddedEvent = 'childAdded';
    var childRemovedEvent = 'childRemoved';
            

    function TransformComponent() {

        Component.call(this);        

        //parent-space
        var position = new VMath.Vector3();        
        var quaternion = new VMath.Quaternion();        
        var scale = new VMath.Vector3(1.0,1.0,1.0);        
        var localTransform = new VMath.Matrix4();
        var localNeedsUpdate = false;
        var localInvTransform = new VMath.Matrix4();
        var localInvNeedsUpdate = false;

        //axes
        var forward = VMath.zAxisNeg.clone();
        var up = VMath.yAxis.clone();
        var right = VMath.xAxis.clone();

        //world-space
        var worldTransform = new VMath.Matrix4();
        var worldInvTransform = new VMath.Matrix4();
        var worldInvTranspose = new VMath.Matrix3();                
        var worldNeedsUpdate = false;
        var hasUniformScale = true;
        var worldInvNeedsUpdate = false;
        var worldInvTransposeNeedsUpdate = false;

        //hierarchy
        var parent = null;
        var children = [];

        var _this = this;

        function onChange() {
            localNeedsUpdate = true;
            localInvNeedsUpdate = true;
            onWorldChanged();
        }

        function onWorldChanged() {
            worldNeedsUpdate = true;
            worldInvNeedsUpdate = true;
            worldInvTransposeNeedsUpdate = true;

            for (var i = 0, count = children.length; i < count ; i++)
                children[i].parentUpdated();

            _this.trigger(transformChangedEvent);
        }

        var axesChanged = false;

        var onRotationChanged = (function () {

            var m = new VMath.Matrix3();

            return function () {
                if (axesChanged)
                    axesChanged = false;
                else {
                    m.fromQuat(quaternion);
                    m.getColumn(0, right);
                    m.getColumn(1, up);
                    m.getColumn(2, forward);
                    forward.negate();                    
                }
            };
        })();

        function onScaleChanged() {
            hasUniformScale = scale.x == scale.y && scale.y == scale.z;
        }
                       
        this.addEventListener(positionChangedEvent, onChange);
        this.addEventListener(quaternionChangedEvent, onChange);
        this.addEventListener(quaternionChangedEvent, onRotationChanged);
        this.addEventListener(scaleChangedEvent, onChange);
        this.addEventListener(scaleChangedEvent, onScaleChanged);        

        Object.defineProperties(this, {
            
            x : {
                get: function () { return position.x; },
                set: function (v) {
                    position.x = v;
                    this.trigger(positionChangedEvent);
                }
            },

            y: {
                get: function () { return position.y; },
                set: function (v) {
                    position.y = v;
                    this.trigger(positionChangedEvent);
                }
            },

            z: {
                get: function () { return position.z; },
                set: function (v) {
                    position.z = v;
                    this.trigger(positionChangedEvent);
                }
            },

            worldX : {
                get: function () {
                    return this.worldPosition.x;
                }            
            },

            worldY: {
                get: function () {
                    return this.worldPosition.y;
                }
            },

            worldZ : {
                get: function () {
                    return this.worldPosition.z;
                }                
            },

            position: {
                get: function () {
                    return position;
                },
                set: function (v) {
                    if(v != position)
                        position.fromVector3(v);
                    this.trigger(positionChangedEvent);
                }
            },

            worldPosition:{

                get: (function () {

                    var column = new VMath.Vector4();
                    var copy = new VMath.Vector3();

                    return function () {
                        //this is the same as worldTransform*(0,0,0,1)^T                          
                        this.worldTransform.getColumn(3, column);
                        copy.fromVector4(column);
                        return copy;
                    };

                })(),

                set: (function () {
                    var pos = new VMath.Vector3();
                    return function (v) {
                        if (parent != null)
                            v = VMath.Vector3.transformMat4(v, parent.worldInvTransform, pos);
                        this.position = v;
                    };
                })()                
            },

            translateOnAxis : {
                value: function (axis, step) {
                    position.scaleAndAdd(axis, step);
                    this.trigger(positionChangedEvent);
                    return this;
                }
            },

            translateX: {
                value: function (step) {
                    return this.translateOnAxis(VMath.xAxis, step);
                }
            },

            translateY: {
                value: function (step) {
                    return this.translateOnAxis(VMath.yAxis, step);
                }
            },

            translateZ: {
                value: function (step) {
                    return this.translateOnAxis(VMath.zAxis, step);
                }
            },

            quaternion: {
                get: function () {
                    return quaternion;                   
                },

                set: function (v) {
                    if(v != quaternion)
                        quaternion.fromQuat(v);
                    this.trigger(quaternionChangedEvent);
                }
            },
                                                
            rotateAboutAxis : {
                value: (function () {
                    var temp = new VMath.Quaternion();
                    return function (axis, rad) {
                        temp.setAxisAngle(axis, rad).multiply(quaternion);
                        quaternion.fromQuat(temp);
                        this.trigger(quaternionChangedEvent);
                        return this;
                    };
                })(),
            },

            rotateX : {
                value: function (rad) {
                    return this.rotateAboutAxis(VMath.xAxis, rad);
                }
            },

            rotateY: {
                value: function (rad) {
                    return this.rotateAboutAxis(VMath.yAxis, rad);                    
                }                
            },

            rotateZ: {
                value: function (rad) {
                    return this.rotateAboutAxis(VMath.zAxis, rad);
                }
            },

            scale: {
                get: function () {
                    return scale;                    
                },

                set: function (v) {
                    if(scale != v)
                        scale.fromVector3(v);
                    this.trigger(scaleChangedEvent);
                }
            },
            
            setUniformScale : {
                value: function (s) {
                    scale.set(s, s, s);
                    this.trigger(scaleChangedEvent);
                    return this;
                }
            },
            
            scaleX : {
                value: function (s) {
                    scale.x *= s;
                    this.trigger(scaleChangedEvent);
                    return this;
                }
            },

            scaleY: {
                value: function (s) {
                    scale.y *= s;
                    this.trigger(scaleChangedEvent);
                    return this;
                }
            },

            scaleZ: {
                value: function (s) {
                    scale.z *= s;
                    this.trigger(scaleChangedEvent);
                    return this;
                }
            },
            
            hasUniformScale :{
                value: function () {

                    var v = hasUniformScale;

                    if (parent != null)
                        v = v && parent.hasUniformScale();
                    
                    return v;
                }
            },

            localTransform: {
                get: function () {
                                        
                    if (localNeedsUpdate) {

                        //build TRS
                        
                        localTransform.fromQuat(quaternion);
                        
                        var data = localTransform.data;

                        //apply translate transform on the left
                        data[12] = position.x;
                        data[13] = position.y;
                        data[14] = position.z;

                        if (hasUniformScale) {
                            var s = scale.x;
                            if (s != 1.0) 
                                scaleMatDataUniform(data, s, 3);
                        } else {
                            //apply scale transform on the right ( scale columns)
                            var s = scale.x;
                            data[0] *= s;
                            data[1] *= s;
                            data[2] *= s;

                            s =  scale.y;
                            data[4] *= s;
                            data[5] *= s;
                            data[6] *= s;

                            s =  scale.z;
                            data[8] *= s;
                            data[9] *= s;
                            data[10] *= s;
                        }                           
                        
                        localNeedsUpdate = false;
                    }
                    return localTransform;
                }
            },

            localInvTransform : {
                get: (function () {
                                        
                    var invQuat = new VMath.Quaternion();

                    return function () {
                        if (localInvNeedsUpdate) {

                            //build SRT

                            invQuat.fromQuat(quaternion).invert();
                            localInvTransform.fromQuat(invQuat);
                            
                            var data = localInvTransform.data;

                            if (hasUniformScale){
                                var s = scale.x;
                                if(s != 1.0)
                                    scaleMatDataUniform(data, 1.0/s, 3);
                            } else {
                                //apply scale transform on the left (scale rows)
                                var invScale = 1.0 / scale.x;
                                data[0] *= invScale;
                                data[4] *= invScale;
                                data[8] *= invScale;

                                invScale = 1.0 / scale.y;
                                data[1] *= invScale;
                                data[5] *= invScale;
                                data[9] *= invScale;

                                invScale = 1.0 / scale.z;
                                data[2] *= invScale;
                                data[6] *= invScale;
                                data[10] *= invScale;                                
                            }
                            
                            //apply translate transform on the right
                            var x = -position.x;
                            var y = -position.y;
                            var z = -position.z;

                            data[12] = data[0] * x + data[4] * y + data[8] * z;
                            data[13] = data[1] * x + data[5] * y + data[9] * z;
                            data[14] = data[2] * x + data[6] * y + data[10] * z;


                            localInvNeedsUpdate = false;
                        }
                        return localInvTransform;
                    };
                })()
            },
            
            worldTransform: {
                get: function () {

                    if (worldNeedsUpdate) {
                        if (parent != null)
                            worldTransform.fromMat4(parent.worldTransform);
                        else
                            worldTransform.identity();

                        worldTransform.multiply(this.localTransform);
                        worldNeedsUpdate = false;
                    }
                    return worldTransform;
                }
            },

            worldInvTransform: {
                get: function () {

                    if (worldInvNeedsUpdate) {
                        worldInvTransform.fromMat4(this.localInvTransform);
                        if (parent != null) 
                            worldInvTransform.multiply(parent.worldInvTransform);
                                                
                        worldInvNeedsUpdate = false;
                    }

                    return worldInvTransform;
                }
            },
                                                
            worldInvTranspose : {
                get: function () {

                    if (worldInvTransposeNeedsUpdate) {
                        if (this.hasUniformScale()) {
                            worldInvTranspose.fromMat4(this.worldTransform);
                        } else {
                            worldInvTranspose.fromMat4(this.worldInvTransform);
                            worldInvTranspose.transpose();
                        }
                        worldInvTransposeNeedsUpdate = false;
                    }

                    return worldInvTranspose;
                }
            },

            setAxes: {
                value: function (right3, up3, forward3) {                    

                    forward.fromVector3(forward3).normalize();
                    VMath.Vector3.cross(right3, forward, up).normalize();
                    VMath.Vector3.cross(forward, up, right);

                    axesChanged = true;
                    this.quaternion = quatFromAxes(right, up, forward, quaternion);
                }
            },

            setWorldAxes : {
                value: function (right3, up3, forward3) {
                    if (parent != null) {
                        var parentWorldInvTransform = parent.worldInvTransform;
                        right3 = VMath.Vector3.transformDirection(right3, parentWorldInvTransform);
                        up3 = VMath.Vector3.transformDirection(up3, parentWorldInvTransform);
                        forward3 = VMath.Vector3.transformDirection(forward3, parentWorldInvTransform);
                    }
                    this.setAxes(right3, up3, forward3);
                }
            },
            
            up:{
                get: function () {
                    return up;
                },

                set: function (v) {                    
                    up.fromVector3(v).normalize();   
                    var relativeUp = VMath.xAxis;
                    var cos = up.dot(relativeUp);

                    //find orthogonal up vector
                    if (VMath.Utils.equalsFloat(cos,1.0))
                        relativeUp = VMath.yAxisNeg;
                    else if (VMath.Utils.equalsFloat(cos, -1.0))
                        relativeUp = VMath.yAxis;
                    
                    axesFromForward(up, relativeUp, forward, right);
                    axesChanged = true;

                    this.quaternion = quatFromAxes(right, up, forward, quaternion);                    
                }
            },

            worldUp : {

                get: (function () {

                    var copy = new VMath.Vector3();

                    return function () {
                        copy.fromVector3(this.up);
                        if (parent != null)
                            copy.transformDirection(parent.worldTransform);
                        return copy;
                    };

                })(),

                set: function (v) {
                    if(parent != null)
                        v = VMath.Vector3.transformDirection(v, parent.worldInvTransform);
                    this.up = v;
                }                
            },

            forward : {
                get: function () {
                    return forward;
                },

                set: function (v) {
                    forward.fromVector3(v).normalize();

                    var relativeUp = VMath.yAxis;                    
                    var cos = forward.dot(relativeUp);

                    //find orthogonal up vector
                    if (VMath.Utils.equalsFloat(cos,1.0))
                        relativeUp = VMath.zAxis;
                    else if (VMath.Utils.equalsFloat(cos, -1.0))
                        relativeUp = VMath.zAxisNeg;
                    
                    axesFromForward(forward, relativeUp, right, up);
                    axesChanged = true;

                    this.quaternion = quatFromAxes(right, up, forward, quaternion);                                  
                }
            },

            worldForward: {

                get: (function () {

                    var copy = new VMath.Vector3();

                    return function () {
                        copy.fromVector3(this.forward);
                        if (parent != null)
                            copy.transformDirection(parent.worldTransform);
                        return copy;
                    };

                })(),

                set: function (v) {
                    if (parent != null)
                        v = VMath.Vector3.transformDirection(v, parent.worldInvTransform);
                    this.forward = v;
                }
            },

            right: {
                get: function () {
                    return right;
                },

                set: function (v) {                    
                    right.fromVector3(v).normalize();

                    var relativeUp = VMath.zAxis;                    
                    var cos = right.dot(relativeUp);

                    //find orthogonal up vector
                    if (VMath.Utils.equalsFloat(cos, 1.0))
                        relativeUp = VMath.xAxisNeg;
                    else if (VMath.Utils.equalsFloat(cos, -1.0))
                        relativeUp = VMath.xAxis;
                    
                    axesFromForward(right, relativeUp, up, forward);
                    axesChanged = true;

                    this.quaternion = quatFromAxes(right, up, forward, quaternion);                    
                }
            },

            worldRight: {

                get: (function () {

                    var copy = new VMath.Vector3();

                    return function () {
                        copy.fromVector3(this.right);
                        if (parent != null)
                            copy.transformDirection(parent.worldTransform);
                        return copy;
                    };

                })(),

                set: function (v) {
                    if (parent != null)
                        v = VMath.Vector3.transformDirection(v, parent.worldInvTransform);
                    this.right = v;
                }                
            },

            lookAt: {
                value: function (v) {                    
                    this.forward = VMath.Vector3.substract(v, position);
                }
            },

            worldLookAt: {

                value: function (v) {
                    
                    if (parent != null)
                        //go to parent space
                        v = VMath.Vector3.transformMat4(v, parent.worldInvTransform);
                    
                    this.lookAt(v);                    
                }
            },

            parent : {
                get : function(){
                    return parent;
                },

                set : function(t){
                    if(parent != null)
                        parent.removeChild(this);
                    parent = t;                    
                    this.parentUpdated();
                }
            },

            parentUpdated: {
                value: function () {
                    onWorldChanged();
                    this.trigger(parentChangedEvent);
                }
            },

            addChild: {
                value: function (t) {

                    if (t.parent == this)
                        return;

                    t.parent = this;                
                    children.push(t);
                    this.trigger(childAddedEvent, t);
                }
            },

            removeChild: {
                value: function (t) {
                    var i = children.indexOf(t);

                    if (i != -1) {
                        children.splice(i, 1);
                        t.parent = null;
                        this.trigger(childRemovedEvent, t);
                    }                        
                }
            },

            getChild : {
                value: function (i) {
                    return children[i];
                }
            },

            childCount: {
                get: function () {
                    return children.length;
                }
            }

        }); 
    }

    function axesFromForward(forward, relativeUp, right, up) {
        VMath.Vector3.cross(forward, relativeUp, right).normalize();
        VMath.Vector3.cross(right, forward, up).normalize();
    }

    var quatFromAxes = (function () {

        var m = new VMath.Matrix3();
        var forwardNeg = new VMath.Vector3();

        return function (right, up, forward, quat) {
                        
            m.setColumn(0, right);
            m.setColumn(1, up);
            forwardNeg.fromVector3(forward).negate();
            m.setColumn(2, forwardNeg);                       
                        
            return quat.fromMat3(m).normalize();
        };

    })();
    
    function scaleMatDataUniform(m, s, count) {
        for (var i = 0; i < count; i++) {
            var index = i * count;
            for (var j = 0; j < count; j++)
                m[index + j] *= s;
        }
    }
        
    TransformComponent.prototype = Object.create(Component.prototype);
    Object.defineProperties(TransformComponent.prototype, {
        constructor: { value: TransformComponent },

        componentType: {
            value : ComponentType.Transform
        }
    });

    return TransformComponent;

});