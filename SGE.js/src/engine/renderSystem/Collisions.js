define(['core/VMath'], function (VMath) {

    'use strict';
                
    //axis-aligned bounding box
    function AABB(max, min) {

        max = max != null ? new VMath.Vector3().fromVector3(max) : new VMath.Vector3();
        min = min != null ? new VMath.Vector3().fromVector3(min) : new VMath.Vector3();

        Object.defineProperties(this, {

            max: {
                get: function () {
                    return max;             
                },

                set: function (v) {
                    if(v != max)
                        max.fromVector3(v);
                }
            },

            min: {

                get: function () {
                    return min;                                            
                },

                set: function (v) {
                    if(v != min)
                        min.fromVector3(v);
                }
            }            
        });
    }

    Object.defineProperties(AABB, {
        fromPoints: {
            value: function (points) {                
                var aabb = new AABB();
                aabb.fromPoints(points);
                return aabb;                
            }
        }
    });

    AABB.prototype = {};
    Object.defineProperties(AABB.prototype, {

        constructor: { value: AABB },

        fromPoints: {
            value: function (points) {
                
                var count = points.length;

                if (count == 0) {                    
                    this.min.set(0.0,0.0,0.0);
                    this.max.set(0.0,0.0,0.0);
                    return;
                }

                var min = VMath.Vector3.fromVector3(points.get(0), this.min);
                var max = VMath.Vector3.fromVector3(min, this.max);

                for (var i = 1; i < count; i++) {
                    var point = points.get(i);
                    min.min(point);
                    max.max(point);
                }

                this.min = min;
                this.max = max;                
            }
        },

        fromBounds: {
            value: function (bounds) {
                if (bounds instanceof AABB)
                    this.fromAABB(bounds);
                else if (bounds instanceof Sphere)
                    this.fromSphere(bounds);                
            }
        },

        fromAABB: {
            value: function (aabb) {
                this.max = aabb.max;
                this.min = aabb.min;
            }
        },

        fromSphere: {
            value: (function () {
                var offset = new VMath.Vector3();

                return function (sphere) {
                    var radius = sphere.radius;
                    var center = sphere.center;

                    offset.set(radius, radius, radius);
                    this.max = offset.add(center);

                    radius *= -1.0;
                    offset.set(radius, radius, radius);
                    this.min = offset.add(center);
                };
                
            })()
        },

        transformByMatrix4: {
            value: (function () {

                var points = new VMath.Vector3Array(8);
                
                return function (m) {
                    var min = this.min;
                    var max = this.max;

                    points.get(0).set(min.x, min.y, min.z).transformMat4(m);
                    points.get(1).set(min.x, min.y, max.z).transformMat4(m);
                    points.get(2).set(min.x, max.y, min.z).transformMat4(m);
                    points.get(3).set(min.x, max.y, max.z).transformMat4(m);
                    points.get(4).set(max.x, min.y, min.z).transformMat4(m);
                    points.get(5).set(max.x, min.y, max.z).transformMat4(m);
                    points.get(6).set(max.x, max.y, min.z).transformMat4(m);
                    points.get(7).set(max.x, max.y, max.z).transformMat4(m);

                    this.fromPoints(points);                    
                };                
            })()
        },

        clone: {
            value: function (out) {
                if (out == null)
                    return new AABB(this.max, this.min);
                else {
                    out.max = this.max;
                    out.min = this.min;
                    return out;
                }
            }
        },

        testFrustum: {
            value: function (frustum) {
                return intersectAABBFrustum(this, frustum);
            }
        }
    });

    //bounding sphere
    function Sphere(center, radius) {

        center = center != null ? new VMath.Vector3().fromVector3(center) : new VMath.Vector3();
        radius = radius != null ? radius :  0.0;
            
        Object.defineProperties(this, {

            center: {

                get: function () {
                    return center;                        
                },

                set: function (v) {
                    if(v != center)
                        center.fromVector3(v);
                }
            },

            radius: {

                get: function () {
                    return radius;
                },

                set: function (v) {
                    radius = v;
                }
            }       
        });
    }

    Object.defineProperties(Sphere, {

        fromPoints: {
            value: function (points) {
                var s = new Sphere();
                s.fromPoints(points);
                return s;
            }
        }
    });

    Sphere.prototype = {};
    Object.defineProperties(Sphere.prototype, {

        constructor: { value: Sphere },

        fromPoints: {
            value: (function () {
                
                var aabb = new AABB();
                var sub = new VMath.Vector3();
                var add = new VMath.Vector3();

                return function (points) {

                    var count = points.length;
                    if (count == 0) {
                        this.center.set(0.0,0.0,0.0);
                        this.radius = 0;
                        return;
                    }

                    aabb.fromPoints(points);

                    var center = VMath.Vector3.add(aabb.max, aabb.min, add).scale(0.5);
                    var radius = 0;

                    for (var i = 0 ; i < count; i++) {
                        var sqLen = VMath.Vector3.substract(points.get(i), center, sub).squaredLength();
                        radius = Math.max(radius, sqLen);
                    }

                    this.center = center;
                    this.radius = Math.sqrt(radius);
                };
            })()
        },

        fromSphere : {
            value: function (sphere) {
                this.center = sphere.center;
                this.radius = sphere.radius;
            }
        },

        fromAABB : {
            value: (function () {
                var v = new VMath.Vector3();
                return function (aabb) {
                    v.fromVector3(aabb.max);
                    v.substract(aabb.min);
                    this.radius = v.len() * 0.5;
                    v.fromVector3(aabb.max);
                    v.add(aabb.min);
                    this.center = v.scale(0.5);
                };

            })()
        },

        fromBounds : {
            value: function (bounds) {
                if (bounds instanceof Sphere)
                    this.fromSphere(bounds);
                else if (bounds instanceof AABB)
                    this.fromAABB(bounds);                
            }
        },

        transformByMatrix4 : {
            value: function (m) {
                this.center.transformMat4(m);
                this.radius = this.radius * m.getMaxScale();
            }
        },

        clone: {
            value: function (out) {
                if(out == null)
                    return new Sphere(this.center, this.radius);
                else {
                    out.center = this.center;
                    out.radius = this.radius;
                    return out;
                }
            }
        },

        intersectRay : {
            value: function (ray) {
                return intersectRaySphere(ray, this);
            }
        },

        testFrustum: {
            value: function (frustum) {
                return intersectSphereFrustum(this, frustum);
            }
        }

    });
        
    function Plane(coefficients) {

        coefficients = coefficients != null ? coefficients : new VMath.Vector4(0.0, 1.0, 0.0, 0.0);        
        var normal = new VMath.Vector3().fromVector4(coefficients);
        
        Object.defineProperties(this, {

            coefficients: {

                get: function () {
                    return coefficients;
                },

                set: function (v) {
                    if(v != coefficients)
                        coefficients.fromVector4(v);
                    normal.fromVector4(coefficients);                    
                }
            },

            normal: {
                get: function () {
                    return normal;
                }                
            },

            normalize: {
                value: function () {
                    var len = normal.len();
                    if (VMath.Utils.equalsFloat(len, 0.0))
                        throw new Error('invalid normal length');
                    len = 1.0 / len;
                    coefficients.scale(len);
                    this.coefficients = coefficients;                    
                }
            },
                        
            pointTest: {
                value: function (p) {
                    return normal.dot(p) + coefficients.w;
                }
            },

            transformByMatrix4: {
                value: (function () {
                    var invTranspose = new VMath.Matrix4();
                    return function (m) {
                        this.normalize();                        
                        VMath.Matrix4.invert(m, invTranspose).transpose();
                        /*
                        * if m = TRS then ((TRS)^-1)^T = (T^-1)^T * R * S^-1
                        * applying this transform to the coefficients is equivalent 
                        * to apply the rotation and scale component to the normal (preserving direction)
                        * and offset the last coefficient by the projection of the inverse translation component 
                        * on the normal (dot(t,n))
                        */                        
                        coefficients.transformMat4(invTranspose);
                        this.coefficients = coefficients;
                        this.normalize();
                    };                    
                })()
            }

        });
    }

    Object.defineProperties(Plane, {
        fromCoefficients: {
            value: function (a, b, c, d) {
                var p = new Plane();
                p.coefficients = new VMath.Vector4(a, b, c, d);
                return p;
            }
        },

        fromPointNormal: {
            value: function (point, normal) {
                var p = new Plane();
                p.fromPointNormal(point, normal);
                return p;                
            }
        },

        fromPoints: {
            value: function (p1, p2, p3) {
                var p = new Plane();
                p.fromPoints(p1, p2, p3);
                return p;
            }
        }       

    });

    Plane.prototype = {};
    Object.defineProperties(Plane.prototype, {

        constructor: { value: Plane },

        fromPointNormal : {
            value: function (point, normal) {                
                var coefficients = this.coefficients.directionFromVector3(normal);
                coefficients.w = -normal.dot(point);
                this.coefficients = coefficients;
            }
        },

        fromPoints: {
            value: function (p1, p2, p3) {
                var v1 = VMath.Vector3.substract(p2, p1);
                var v2 = VMath.Vector3.substract(p3, p1);
                v1.cross(v2);
                this.fromPointNormal(p1, v1);                
            }
        },

        intersectRay: {
            value: function (ray) {
                return intersectRayPlane(ray, this);
            }
        },

        clone: {
            value: function () {
                return new Plane(this.coefficients.clone());
            }
        }
    });

    function Frustum(left, right, bottom, top, near, far) {
                        
        left = left != null ? left.clone() : new Plane();
        right = right != null ? right.clone() : new Plane();
        bottom = bottom != null ? bottom.clone() : new Plane();
        bottom = bottom != null ? bottom.clone() : new Plane();
        top = top != null ? top.clone() : new Plane();
        near = near != null ? near.clone() : new Plane();
        far = far != null ? far.clone() : new Plane();
            
        var planes = new Array(6);
        planes[0] = left;
        planes[1] = right;
        planes[2] = bottom;
        planes[3] = top;
        planes[4] = near;
        planes[5] = far;

        Object.defineProperties(this, {

            fromPerspectiveTransform: {

                /// the resulting frustum will be in the input space of proj,
                /// could be either a perspective projection or a view transform followed 
                /// by the projection, so the frustum would be in view or world space
                /// [Real time rendering, Moller]
                value: (function () {

                    var coefficients = new VMath.Vector4Array(6);
                    var rows = new VMath.Vector4Array(4);

                    return function (proj) {

                        //rows
                        var m0 = proj.getRow(0, rows.get(0));
                        var m1 = proj.getRow(1, rows.get(1));
                        var m2 = proj.getRow(2, rows.get(2));
                        var m3 = proj.getRow(3, rows.get(3));

                        //planes coefficients
                        coefficients.get(0).fromVector4(m0).add(m3).negate();
                        coefficients.get(1).fromVector4(m3).substract(m0).negate();
                        coefficients.get(2).fromVector4(m1).add(m3).negate();
                        coefficients.get(3).fromVector4(m3).substract(m1).negate();
                        coefficients.get(4).fromVector4(m2).add(m3).negate();
                        coefficients.get(5).fromVector4(m3).substract(m2).negate();
                            
                        for (var i = 0 ; i < 6; i++) {
                            var p = planes[i];
                            p.coefficients = coefficients.get(i);
                            p.normalize();
                        }
                    };
                        
                })()
            },

            fromFrustum : {
                value: function (frustum) {
                    var frustumPlanes = frustum.planes;
                    for (var i = 0; i < 6; i++)
                        planes[i].coefficients = frustumPlanes[i].coefficients;
                }
            },
                
            planes: {
                value: planes
            },

            transformByMatrix4 : {
                value: function (m) {
                    //transform all the planes
                    for (var i = 0; i < 6; i++) {
                        var plane = planes[i];
                        plane.transformByMatrix4(m);                        
                    }
                }
            },

            containsPoint: {
                value: containsPoint(planes)
            }
        });
    }

    function containsPoint(planes) {
        return function (point) {
            for (var i = 0; i < 6; i++)
                if (planes[i].pointTest(point) > 0)
                    return false;
            return true;
        };
    }

    Object.defineProperties(Frustum, {
        fromPerspectiveTransform: {
            value: function (proj) {
                var f = new Frustum();
                f.fromPerspectiveTransform(proj);
                return f;
            }
        }
    });

    Frustum.prototype = {};
    Object.defineProperties(Frustum.prototype, {

        constructor: { value: Frustum },

        intersectAABB: {
            value: function (aabb) {
                var res = intersectAABBFrustum(aabb, this);
                return res == 1;
            }
        },

        intersectSphere: {
            value: function (sphere) {
                var res = intersectSphereFrustum(sphere, this);
                return res == 1;
            }
        },

        containsAABB: {
            value: function (aabb) {
                var res = intersectAABBFrustum(aabb, this);
                return res == -1;
            }
        },

        containsSphere: {
            value: function (sphere) {
                var res = intersectSphereFrustum(sphere, this);
                return res == -1;
            }
        },

        clone: {
            value: function () {
                var planes = this.planes;
                return new Frustum(
                    planes[0],
                    planes[1],
                    planes[2],
                    planes[3],
                    planes[4],
                    planes[5]
                    );
            }
        }
    });


    function Ray(origin, direction) {

        origin = origin != null ? origin : new VMath.Vector3();
        direction = direction != null ? direction.normalize() : new VMath.Vector3(0.0,0.0,-1.0);
            
        Object.defineProperties(this, {

            origin: {
                get : function(){
                    return origin;                                            
                },

                set: function (v) {
                    if(v != origin)
                        origin.fromVector3(v);
                }
            },

            direction: {
                get: function () {
                    return direction;                    
                },

                set: function (v) {
                    if(v != direction)
                        direction.fromVector3(v);
                    direction.normalize();
                }
            },

            getPoint : {
                value: function (t, out) {
                    if (out == null)
                        out = new VMath.Vector3();
                    out.fromVector3(origin);
                    out.scaleAndAdd(direction, t);
                    return out;
                }
            },

            transformByMatrix4: {
                value: function (m) {
                    origin.transformMat4(m);
                    direction.transformDirection(m);
                }
            }
        });
    }

    Ray.prototype = {};
    Object.defineProperties(Ray.prototype, {

        constructor: { value: Ray },

        intersectPlane : {
            value: function (plane) {
                return intersectRayPlane(this, plane);
            }
        },

        intersectSphere : {
            value: function (sphere) {
                return intersectRaySphere(this, sphere);
            }
        },

        clone: {
            value: function () {
                var origin = VMath.Vector3.fromVector3(this.origin);
                var direction = VMath.Vector3.fromVector3(this.direction);
                return new Ray(origin, direction);
            }
        }

    });

        
    /// returns 1 if the aabb intersects the plane
    /// returns 0 if the aabb is entirely in the positive half space of the plane
    /// returns -1 if the aabb is entirely in the negative half space of the plane
    var intersectAABBPlane = (function(){
        
        var p = new VMath.Vector3();
        var q = new VMath.Vector3();

        return function (aabb, plane) {

            var planeNormal = plane.normal;

            var boxMax = aabb.max;
            var boxMin = aabb.min;

            //pq = box diagonal most aligned with the plane normal
            
            if (planeNormal.x >= 0.0) {
                p.x = boxMin.x;
                q.x = boxMax.x;
            } else {
                p.x = boxMax.x;
                q.x = boxMin.x;
            }

            if (planeNormal.y >= 0.0) {
                p.y = boxMin.y;
                q.y = boxMax.y;
            } else {
                p.y = boxMax.y;
                q.y = boxMin.y;
            }

            if (planeNormal.z >= 0.0) {
                p.z = boxMin.z;
                q.z = boxMax.z;
            } else {
                p.z = boxMax.z;
                q.z = boxMin.z;
            }

            //test points
            var testP = plane.pointTest(p);

            //if p is in front of the plane, so is q
            if (testP > 0)
                return 0;

            var testQ = plane.pointTest(q);

            //if q is behind the plane, so is p
            if (testQ < 0)
                return -1;

            //p is behind the plane and q is in front of it
            //so the aabb intersects the plane

            return 1;
        };
    })();
                
    /// returns 1 if the sphere intersects the plane
    /// returns 0 if the sphere is entirely in the positive half space of the plane
    /// returns -1 if the sphere is entirely in the negative half space of the plane
    function intersectSpherePlane(sphere, plane) {

        var sphereCenter = sphere.center;
        var sphereRadius = sphere.radius;

        //test the sphere center, i.e. find the signed distance from the plane
        var testCenter = plane.pointTest(sphereCenter);

        if (testCenter > sphereRadius)
            return 0;
        else if (testCenter < -sphereRadius)
            return -1;
        else
            return 1;
    }

    function intersectFrustum(testPlaneFun, boundings, frustum) {

        var frustumPlanes = frustum.planes;

        var intersects = 0;

        for (var i = 0; i < 6; i++) {

            var testPlane = testPlaneFun(boundings, frustumPlanes[i]);

            if (testPlane == 1)
                //intersection
                intersects = 1;
            else if (testPlane == 0)
                //positive space of the plane -> entirely outside the frustum
                return 0;

            /*
            * negative space of the plane -> could be entirely inside the frustum 
            * or intersect another plane (or outside for another plane), keep testing
            */
        }

        if (intersects == 1)
            return 1;

        //entirely inside the frustum
        return -1;
    }

    /// returns 1 if the aabb intersects the frustum
    /// returns 0 if the aabb is entirely outside the frustum
    /// returns -1 if the aabb is entirely inside the frustum
    function intersectAABBFrustum(aabb, frustum) {
        return intersectFrustum(intersectAABBPlane, aabb, frustum);
    }
        
    /// returns 1 if the sphere intersects the frustum
    /// returns 0 if the sphere is entirely outside the frustum
    /// returns -1 if the sphere is entirely inside the frustum
    function intersectSphereFrustum(sphere, frustum) {
        return intersectFrustum(intersectSpherePlane, sphere, frustum);            
    }

    /// given the ray equation r(t), returns t' such that r(t') lies on the plane
    /// returns null if there is no intersection
    function intersectRayPlane(ray, plane) {        
        /*
        *   r(t) = origin +t*direction, plane(x) = dot(normal,x) + coefficients.w
        *   find t such that plane(r(t)) == 0
        *   plane(r(t)) = dot(normal, origin + t*direction) + coefficients.w
        *               = dot(normal, origin) + t*dot(normal, direction) + coefficients.w == 0
        *               =>  t = (-dot(normal, origin) - coefficients.w) / dot(normal, direction)
        *                     = -plane.pointTest(origin) / dot(normal, direction)
        */
        var nDotV = ray.direction.dot(plane.normal);
        if (VMath.Utils.equalsFloat(nDotV, 0.0)) {
            //ray direction parallel to the plane
            //there could be either no or infinite many intersections (the latter if the origin lies one the plane)
            if (plane.pointTest(ray.origin) == 0)
                return 0.0;

            return null;
        }
        var minus_pointTest = -plane.pointTest(ray.origin);
        var t = minus_pointTest / nDotV;
        if (t >= 0.0)
            return t;

        //if t < 0 the ray does not intersect the plane but the line coincident with the ray does, (intersection behind)
        return null;
    }

    /// given the ray equation r(t), returns the minimum t' such that r(t') is an intersection point between the ray 
    /// and the sphere
    var intersectRaySphere = (function () {

        var p = new VMath.Vector3();
        
        return function (ray, sphere) {

            /*
            *   given r the sphere radius, c the sphere center
            *   a point p on the surface of the sphere satisfies : 
            *   r = length(p - c)
            *   
            *   given the ray equation q(t) = origin + t*direction
            *   find t1 and t2 such that q(t1) and q(t2) satisfy the sphere equation
            *   
            *   r = length(origin + t*direction - c) = length(origin - c + t*direction)
            *   let p = origin - c
            *   => r = length(p + t*direction)
            *   => r^2 = dot(p + t*direction, p + t*direction)
            *   => r^2 = dot(p,p) + 2t*dot(p,direction) + dot(direction, direction)*t^2
            *   direction is unit length so dot(direction, direction ) = 1
            *   => t^2 + 2t*dot(p,direction) + dot(p,p) -r^2 = 0
            *   a quadratic equation with a = 1, b = 2*dot(p,direction) and c = dot(p,p) - r^2
            *   the solutions of the quadratic equation give the instersection points
            */
            
            var radius = sphere.radius;
            p.fromVector3(ray.origin).substract(sphere.center);
            var b = 2.0 * p.dot(ray.direction);
            var c = p.dot(p) - radius * radius;

            var delta = b * b - 4 * c;

            if (delta < 0) 
                return null;
            
            delta = Math.sqrt(delta);

            b = -b;
            var t1 = (b + delta) / 2.0;
            
            if (delta == 0)
                //the ray intersect a point tangent to the sphere
                return t1;

            var t2 = (b - delta) / 2.0;

            return Math.min(t1, t2);            
        };

    })();
        
    return Object.freeze({
        AABB: AABB,
        Sphere : Sphere,
        Plane : Plane,
        Frustum: Frustum,
        Ray : Ray
    });

});
