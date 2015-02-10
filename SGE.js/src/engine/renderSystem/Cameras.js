define(['core/VMath', 'engine/Object3D', './Collisions'], function (VMath, Object3D, Collisions) {
    'use strict';

    var Component = Object3D.Component;
    var ComponentType = Object3D.ComponentType;
        
    var postEffectMaterialAddedEvent = 'postEffectMaterialAdded';
    var postEffectMaterialRemovedEvent = 'postEffectMaterialRemoved';
    var renderTargetChangedEvent = 'renderTargetChanged';
    var viewPortChangedEvent = 'viewPortChanged';
    var skyBoxChangedEvent = 'skyBoxChanged';
    var projectionChangedEvent = 'projectionChanged';

    var RenderSortType = Object.freeze({        
        OPAQUE_FIRST: 0,
        NONE : 1,
        DONT_CARE : 2
    });

    var CullType = Object.freeze({
        ENABLED: 0,
        DISABLED: 1
    });
            
    function Camera(parameters) {

        Component.call(this);
                               
        var isPerspective;
        var custom;
        var fovY;
        var aspectRatio;
        var near;
        var far;
        var left;
        var right;
        var bottom;
        var top;

        if (parameters != null) {
            isPerspective = parameters.isPerspective;
            custom = parameters.isUsingCustomBounds;
            fovY = parameters.fovY;
            aspectRatio = parameters.aspectRatio;
            near = parameters.near;
            far = parameters.far;
            left = parameters.left;
            right = parameters.right;
            bottom = parameters.bottom;
            top = parameters.top;
        }

        if (isPerspective == null)
            isPerspective = true;
        if (custom == null)
            custom = false;
        if (fovY == null)
            fovY = Math.PI * 0.25;
        if (aspectRatio == null)
            aspectRatio = 16.0 / 9.0;
        if (near == null)
            near = 0.1;
        if (far == null)
            far = 1000.0;
        if (left == null)
            left = -1.0;
        if (right == null)
            right = 1.0;
        if (bottom == null)
            bottom = -1.0;
        if (top == null)
            top = 1.0;

        var projUpdateFun;

        if (!isPerspective) {
            custom = true;
            projUpdateFun = 'ortho';
        } else
            projUpdateFun = 'frustum';

        var view = new VMath.Matrix4();
        var viewNeedsUpdate = true;
                
        var projection = new VMath.Matrix4();
        var projView = new VMath.Matrix4();
        
        var projNeedsUpdate = true;
        var projViewNeedsUpdate = true;        
        
        var bounds = new Collisions.Frustum();
        var cullType = CullType.ENABLED;
        var boundsNeedsUpdate = true;

        var transformComponent;
        var _this = this;

        var renderTarget = null;
        var viewPort = null;
        var renderOrder = 0;
        var renderSortType = RenderSortType.DONT_CARE;
        var renderLayer = 0;
        var postEffectMaterials = [];
        var skyBox = null;

        function onProjChanged() {
            projNeedsUpdate = true;
            projViewNeedsUpdate = true;                        
            boundsNeedsUpdate = true;
            _this.trigger(projectionChangedEvent);
        }

        function onTransformChanged() {
            viewNeedsUpdate = true;
            projViewNeedsUpdate = true;            
            boundsNeedsUpdate = true;
        }
                                
        Object.defineProperties(this, {
                        
            onActivated: {
                value: function () {
                    transformComponent = this.object3D.transformComponent;
                    transformComponent.addEventListener('transformChanged', onTransformChanged);
                }                
            },

            onDeactivated: {
                value: function () {                        
                    transformComponent.removeEventListener('transformChanged', onTransformChanged);
                    transformComponent = null;
                }                
            },

            view: {
                get: function () {
                    if (viewNeedsUpdate) {
                        view.fromMat4(transformComponent.worldInvTransform);                            
                        viewNeedsUpdate = false;
                    }
                    return view;
                }
            },

            makePerspective: {
                value: function () {
                    if (!isPerspective) {
                        isPerspective = true;
                        projUpdateFun = 'frustum';
                        onProjChanged();
                    }
                }
            },
                        
            makeOrthographic: {
                value: function () {
                    if (isPerspective) {
                        isPerspective = false;
                        custom = true;
                        projUpdateFun = 'ortho';
                        onProjChanged();
                    }
                }
            },

            useCustomBounds: {
                value: function (v) {
                    v = v != null ? v : true;
                    custom = v;
                }
            },

            isPerspective: {
                value: function () {
                    return isPerspective;
                }
            },

            isOrthographic: {
                value: function () {
                    return !isPerspective;
                }
            },

            isUsingCustomBounds: {
                value: function () {
                    return custom;
                }
            },

            fovY: {
                get: function () { return fovY; },
                set: function (v) {
                    fovY = v;
                    if (!custom && isPerspective)
                        onProjChanged();
                }
            },

            aspectRatio: {
                get: function () { return aspectRatio; },
                set: function (v) {
                    aspectRatio = v;
                    if (!custom && isPerspective)
                        onProjChanged();
                }
            },

            near: {
                get: function () { return near; },
                set: function (v) {
                    near = v;
                    onProjChanged();
                }
            },

            far: {
                get: function () { return far; },
                set: function (v) {
                    far = v;
                    onProjChanged();
                }
            },

            left: {
                get: function () { return left; },
                set: function (v) {
                    left = v;
                    if (custom || !isPerspective)
                        onProjChanged();
                }
            },

            right: {
                get: function () { return right; },
                set: function (v) {
                    right = v;
                    if (custom || !isPerspective)
                        onProjChanged();
                }
            },

            bottom: {
                get: function () { return bottom; },
                set: function (v) {
                    bottom = v;
                    if (custom || !isPerspective)
                        onProjChanged();
                }
            },

            top: {
                get: function () { return top; },
                set: function (v) {
                    top = v;
                    if (custom || !isPerspective)
                        onProjChanged();
                }
            },

            projection: {
                get: function () {

                    if (projNeedsUpdate) {

                        if (!custom) {
                            /**
                            * given the near plane and the fovy that we want : 
                            * top / near = tan (fovY / 2) => top = near * tan(fovY) 
                            * 
                            *                /top
                            *               / |
                            *              /  |
                            *             /   |
                            *            /    |       alpha = fovY / 2
                            *      y    /     |
                            *      |   /      |
                            *      |  /       |
                            *      | /alpha   |near
                            *   eye|/_________|________ z
                            *       \ alpha   |        
                            *        \        |
                            *         \       |
                            *          \      |
                            *           \     |
                            *            \    |
                            *             \   | 
                            *              \  |
                            *               \bottom
                            */
                            var half_height = near * Math.tan(fovY * 0.5);
                            var half_width = half_height * aspectRatio;
                            var _right = half_width;
                            var _left = -_right;
                            var _top = half_height;
                            var _bottom = -_top;
                        } else {
                            var _right = right;
                            var _left = left;
                            var _top = top;
                            var _bottom = bottom;
                        }
                        
                        projection = VMath.Matrix4[projUpdateFun](_left, _right, _bottom, _top, near, far, projection);

                        projNeedsUpdate = false;
                    }

                    return projection;
                }
            },

            projectionView: {
                get: function () {
                    if (projViewNeedsUpdate) {
                        projView.fromMat4(this.projection);
                        projView.multiply(this.view);
                        projViewNeedsUpdate = false;
                    }                        
                    return projView;
                }
            },
                        
            cullType : {
                get: function () {
                    return cullType;
                },
                set: function (v) {
                    cullType = v;
                }
            },

            bounds: {
                get: function () {
                    if (boundsNeedsUpdate) {
                        bounds.fromPerspectiveTransform(this.projectionView);
                        boundsNeedsUpdate = false;
                    }
                    
                    return bounds;
                }
            },

            renderTarget: {
                get: function () {
                    return renderTarget;
                },
                set: function (v) {
                    renderTarget = v;
                    this.trigger(renderTargetChangedEvent);
                }
            },

            viewPort: {
                get: function () {
                    return viewPort;
                },
                set: function (v) {
                    viewPort = v;
                    this.trigger(viewPortChangedEvent);
                }
            },

            renderSortType : {
                get: function () {
                    return renderSortType;
                },
                set: function (v) {
                    renderSortType = v;
                }
            },

            renderOrder: {
                get: function () {
                    return renderOrder;
                },

                set: function (v) {
                    renderOrder = v;
                }
            },

            renderLayer : {
                get: function () {
                    return renderLayer;
                },
                set: function (v) {
                    renderLayer = Math.abs(v);
                }
            },
                        
            postEffectMaterialsCount: {
                get: function () {
                    return postEffectMaterials.length;
                }
            },

            addPostEffectMaterial: {
                value: function (mat) {
                    postEffectMaterials.push(mat);
                    this.trigger(postEffectMaterialAddedEvent, mat);
                }
            },

            removePostEffectMaterial: {
                value: function (mat) {
                    var index = postEffectMaterials.indexOf(mat);
                    if (index == -1)
                        return;

                    postEffectMaterials.splice(index, 1);
                    this.trigger(postEffectMaterialRemovedEvent, mat);
                }
            },

            getPostEffectMaterial: {
                value: function (index) {
                    return postEffectMaterials[index];
                }
            },

            skyBox: {
                get: function () {
                    return skyBox;
                },
                set: function (v) {
                    skyBox = v;
                    this.trigger(skyBoxChangedEvent);                    
                }
            }            

        });
    }
        
    Camera.prototype = Object.create(Component.prototype);
    Object.defineProperties(Camera.prototype, {

        constructor: { value: Camera },

        componentType : {
            value: ComponentType.Camera
        },

        clone: {
            value: function () {
                var camera = new Camera({
                    isPerspective : this.isPerspective(),
                    isUsingCustomBounds : this.isUsingCustomBounds(),
                    fovY : this.fovY,
                    aspectRatio : this.aspectRatio,
                    near : this.near,
                    far : this.far,
                    left : this.left,
                    right : this.right,
                    bottom : this.bottom,
                    top: this.top
                });

                camera.renderOrder = this.renderOrder;
                camera.renderSortType = this.renderSortType;
                camera.renderLayer = this.renderLayer;
                camera.cullType = this.cullType;
                camera.skyBox = this.skyBox;
                camera.renderTarget = this.renderTarget;
                camera.viewPort = this.viewPort;

                var postEffectMaterialsCount = this.postEffectMaterialsCount;
                for (var i = 0 ; i < postEffectMaterialsCount; i++)
                    camera.addPostEffectMaterial(this.getPostEffectMaterial(i));

                return camera;
            }
        }
    });
    
    return Object.freeze({
        RenderSortType: RenderSortType,
        CullType : CullType,
        Camera: Camera    
    });
});

    
