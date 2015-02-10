define(['core/IDObject', 'core/PrimitiveTopology', './Collisions', 'core/VMath'], function (IDObject, PrimitiveTopology, Collisions, VMath) {

    'use strict';
    
    function Mesh(parameters) {

        IDObject.call(this);

        var vertexBuffer = parameters.vertexBuffer;
        var indexBuffer = parameters.indexBuffer;
        var primitiveTopology = parameters.primitiveTopology;        
        var positions = parameters.positions;
                        
        if (primitiveTopology == null)
            primitiveTopology = PrimitiveTopology.TRIANGLES;        
                    
        parameters = null;
        var bounds;
        var hasSphereBounds = false;
        if(positions != null){
            bounds = Collisions.Sphere.fromPoints(positions);
            hasSphereBounds = true;
        }

        Object.defineProperties(this, {

            vertexBuffer: {
                get: function () {
                    return vertexBuffer;
                }
            },

            indexBuffer: {
                get: function () {
                    return indexBuffer;
                }
            },
                 
            primitiveTopology: {
                get: function () {
                    return primitiveTopology;
                },
                set: function (v) {
                    primitiveTopology = v;
                }
            },
                        
            positions: {
                get: function () {
                    return positions;
                }
            },

            bounds: {
                get: function () {
                    return bounds;
                },
                set: function (v) {
                    bounds = v;
                    if (v == null || v instanceof Collisions.AABB) {
                        hasSphereBounds = false;
                        return;
                    }                        
                    hasSphereBounds = true;
                }
            },
            
            makeBoundsAABB : {
                value: function () {
                    if (bounds == null) {
                        bounds = new Collisions.AABB();                       
                        return;
                    }
                    if (!hasSphereBounds)
                        return;
                    var aabb = new Collisions.AABB();                    
                    aabb.fromSphere(bounds);
                    bounds = aabb;
                    hasSphereBounds = false;
                }
            },

            makeBoundsSphere:{
                value: function () {
                    if (bounds == null) {
                        bounds = new Collisions.Sphere();
                        return;
                    }
                    if (hasSphereBounds)
                        return;
                    var s = new Collisions.Sphere();
                    s.fromAABB(bounds);
                    bounds = s;
                    hasSphereBounds = true;
                }
            },

            release: {
                value: function () {
                    if (vertexBuffer != null) {
                        vertexBuffer.release();
                        vertexBuffer = null;
                    }
                    if (indexBuffer != null) {
                        indexBuffer.release();
                        indexBuffer = null;
                    }
                    positions = null;
                    bounds = null;
                }
            }

        });
    }

    Mesh.prototype = Object.create(IDObject.prototype);
    Object.defineProperties(Mesh.prototype, {

        constructor: { value: Mesh },

        clone: {
            value: function () {

                var vBuff = this.vertexBuffer;
                var iBuff = this.indexBuffer;                                
                
                return new Mesh({
                    vertexBuffer: vBuff != null ? vBuff.clone() : null,
                    indexBuffer : iBuff != null ? iBuff.clone() : null,
                    primitiveTopology : this.primitiveTopology,                    
                    positions : this.positions
                });
            }
        }

    });

    function SkinnedMesh(parameters) {
            
        Mesh.call(this, parameters);

        var influences = parameters.influences;
        var influencesPerVertex = parameters.influencesPerVertex;
        parameters = null;

        if (influences == null)
            influences = [];
        
        Object.defineProperties(this, {
                
            influences : {
                value : influences
            },

            influencesPerVertex: {
                value: influencesPerVertex
            },

            bonesTransforms: {
                value : new VMath.Matrix4Array(influences.length)
            },

            bonesInvTransposes: {
                value : new VMath.Matrix3Array(influences.length)
            }

        });
    }
                
    SkinnedMesh.prototype = Object.create(Mesh.prototype);
    Object.defineProperty(SkinnedMesh.prototype, 'constructor', { value: SkinnedMesh });
        
    return Object.freeze({
        Mesh: Mesh,
        SkinnedMesh: SkinnedMesh
    });
});
