define(['libs/gl-matrix'], function (GlMatrix) {

    'use strict';
    var vec2 = GlMatrix.vec2;
    var vec3 = GlMatrix.vec3;
    var vec4 = GlMatrix.vec4;
    var mat2 = GlMatrix.mat2;
    var mat3 = GlMatrix.mat3;
    var mat4 = GlMatrix.mat4;
    var quat = GlMatrix.quat;

    function createIfNull(namespace, ctor, out) {
        if (out == null)
            out = new ctor(namespace.create());
        return out;
    }

    function initConstructor(ctor, privateCtor, namespace, init, initPrototype) {

        Common.call(ctor, namespace, privateCtor);

        var i;
        var count;

        if (init instanceof Array) {
            for (i = 0, count = init.length; i < count; i++)
                init[i].call(ctor, namespace, privateCtor);
        } else
            init.call(ctor, namespace, privateCtor);

        var proto = {};

        ctor.prototype = proto;
        privateCtor.prototype = proto;
        Object.defineProperty(proto, 'constructor', { value: ctor });

        CommonPrototype.call(proto, namespace, ctor);

        if (initPrototype instanceof Array) {
            for (i = 0, count = initPrototype.length; i < count; i++)
                initPrototype[i].call(proto, namespace, ctor);
        } else
            initPrototype.call(proto, namespace, ctor);
    }

    function Common(namespace, privateCtor) {

        Object.defineProperties(this, {

            clone: {
                value: function (v) {
                    return new privateCtor(namespace.clone(v.data));
                }
            },

            copy: {
                value: function (v1, v2) {
                    namespace.copy(v1.data, v2.data);
                    return v1;
                }
            },

            multiply: {
                value: function (v1, v2, out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.multiply(out.data, v1.data, v2.data);
                    return out;
                }
            },

            str: {
                value: function (v) {
                    return namespace.str(v.data);
                }
            }

        });
    }

    //common Vector* prop
    function Vector(namespace, privateCtor) {

        Object.defineProperties(this, {

            add: {
                value: function (v1, v2, out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.add(out.data, v1.data, v2.data);
                    return out;
                }
            },
                        
            len: {
                value: function (v) {
                    return namespace.len(v.data);
                }
            },

            lerp: {
                value: function (v1, v2, t, out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.lerp(out.data, v1.data, v2.data, t);
                    return out;
                }
            },

            dot: {
                value: function (v1, v2) {
                    return namespace.dot(v1.data, v2.data);
                }
            },

            normalize: {
                value: function (v, out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.normalize(out.data, v.data);
                    return out;
                }
            },

            scale: {
                value: function (v, s, out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.scale(out.data, v.data, s);
                    return out;
                }
            },

            squaredLength: {
                value: function (v) {
                    return namespace.squaredLength(v.data);
                }
            }

        });

        if (namespace != quat)
            Object.defineProperties(this, {

                distance: {
                    value: function (v1, v2) {
                        return namespace.distance(v1.data, v2.data);
                    }
                },

                divide: {
                    value: function (v1, v2, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.divide(out.data, v1.data, v2.data);
                        return out;
                    }
                },

                forEach: {
                    value: function (a, stride, offset, count, fn, arg) {
                        return namespace.forEach(a, stride, offset, count, fn, arg);
                    }
                },

                max: {
                    value: function (v1, v2, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.max(out.data, v1.data, v2.data);
                        return out;
                    }
                },

                min: {
                    value: function (v1, v2, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.min(out.data, v1.data, v2.data);
                        return out;
                    }
                },

                negate: {
                    value: function (v, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.negate(out.data, v.data);
                        return out;
                    }
                },

                random: {
                    value: function (s, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.random(out.data, s);
                        return out;
                    }
                },

                scaleAndAdd: {
                    value: function (v1, v2, s, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.scaleAndAdd(out.data, v1.data, v2.data, s);
                        return out;
                    }
                },

                squaredDistance: {
                    value: function (v1, v2) {
                        return namespace.squaredDistance(v1.data, v2.data);
                    }
                },

                substract: {
                    value: function (v1, v2, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.subtract(out.data, v1.data, v2.data);
                        return out;
                    }
                },

                transformMat4: {
                    value: function (v, m, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.transformMat4(out.data, v.data, m.data);
                        return out;
                    }
                }
            });

        if (namespace == vec2 || namespace == vec3)
            Object.defineProperties(this, {

                transformMat3: {
                    value: function (v, m, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.transformMat3(out.data, v.data, m.data);
                        return out;
                    }
                }

            });

        if (namespace == vec3 || namespace == vec4)
            Object.defineProperties(this, {

                transformQuat: {
                    value: function (v, q, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.transformQuat(out.data, v.data, q.data);
                        return out;
                    }
                }

            });
    }

    function CommonPrototype(namespace, ctor) {

        Object.defineProperties(this, {

            clone: {
                value: function () {
                    return ctor.clone(this);
                }
            },

            copy: {
                value: function (v) {
                    return ctor.copy(this, v);
                }
            },

            multiply: {
                value: function (v) {
                    return ctor.multiply(this, v, this);
                }
            },

            str: {
                value: function () {
                    return ctor.str(this);
                }
            }

        });
    }

    //common Vector* constructor
    function VectorPrototype(namespace, ctor) {

        Object.defineProperties(this, {

            add: {
                value: function (v) {
                    return ctor.add(this, v, this);
                }
            },

            len: {
                value: function () {
                    return ctor.len(this);
                }
            },

            lerp: {
                value: function (v, t) {
                    return ctor.lerp(this, v, t, this);
                }
            },

            dot: {
                value: function (v) {
                    return ctor.dot(this, v);
                }
            },

            normalize: {
                value: function () {
                    return ctor.normalize(this, this);
                }
            },

            scale: {
                value: function (s) {
                    return ctor.scale(this, s, this);
                }
            },

            squaredLength: {
                value: function () {
                    return ctor.squaredLength(this);
                }
            }
        });


        if (namespace != quat)
            Object.defineProperties(this, {

                distance: {
                    value: function (v) {
                        return ctor.distance(this, v);
                    }
                },

                divide: {
                    value: function (v) {
                        return ctor.divide(this, v, this);
                    }
                },

                max: {
                    value: function (v) {
                        return ctor.max(this, v, this);
                    }
                },

                min: {
                    value: function (v) {
                        return ctor.min(this, v, this);
                    }
                },

                negate: {
                    value: function () {
                        return ctor.negate(this, this);
                    }
                },
                random: {
                    value: function (s) {
                        return ctor.random(s, this);
                    }
                },

                scaleAndAdd: {
                    value: function (v, s) {
                        return ctor.scaleAndAdd(this, v, s, this);
                    }
                },

                squaredDistance: {
                    value: function (v) {
                        return ctor.squaredDistance(this, v);
                    }
                },

                substract: {
                    value: function (v) {
                        return ctor.substract(this, v, this);
                    }
                },

                transformMat4: {
                    value: function (m) {
                        return ctor.transformMat4(this, m, this);
                    }
                }
            });

        if (namespace == vec2 || namespace == vec3)
            Object.defineProperties(this, {

                transformMat3: {
                    value: function (m) {
                        return ctor.transformMat3(this, m, this);
                    }
                }
            });
            
        if (namespace == vec3 || namespace == vec4)
            Object.defineProperties(this, {

                transformQuat: {
                    value: function (q) {
                        return ctor.transformQuat(this, q, this);
                    }
                }
            });
    }


    function PropertyData(data) {
        Object.defineProperty(this, 'data', { value: data });
    }

    function PropertyXY(data) {

        Object.defineProperties(this, {

            x: {
                get: function () { return data[0]; },
                set: function (v) {
                    data[0] = v;
                }
            },

            y: {
                get: function () { return data[1]; },
                set: function (v) {
                    data[1] = v;
                }
            }
        });
    }

    function PropertyZ(data) {

        Object.defineProperty(this, 'z', {

            get: function () { return data[2]; },

            set: function (v) {
                data[2] = v;
            }

        });
    }

    function PropertyW(data) {

        Object.defineProperty(this, 'w', {

            get: function () { return data[3]; },

            set: function (v) {
                data[3] = v;
            }

        });
    }

    //Vector2

    /// private ctor
    function _Vector2(data) {
        PropertyData.call(this, data);
        PropertyXY.call(this, data);
    }

    /// public ctor
    function Vector2(x, y) {

        if (x == null)
            x = 0.0;
        if (y == null)
            y = 0.0;

        var data = vec2.fromValues(x, y);
        _Vector2.call(this, data);
    }

    initConstructor(Vector2, _Vector2, vec2, Vector, VectorPrototype);

    Object.defineProperties(Vector2, {

        fromVector2 : {
            value: function (v, out) {
                out = createIfNull(vec2, _Vector2, out);
                out.set(v.x, v.y);
                return out;
            }
        },

        set: {
            value: function (v, x, y) {
                vec2.set(v.data, x, y);
                return v;
            }
        },

        cross: {
            value: function (v1, v2, out) {
                out = createIfNull(vec3, _Vector3, out);                    
                vec2.cross(out.data, v1.data, v2.data);
                return out;
            }
        },

        transformFromMat2: {
            value: function (v, m, out) {
                out = createIfNull(vec2, _Vector2, out);
                vec2.transformMat2(out.data, v.data, m.data);
                return out;
            }
        }

    });

    Object.defineProperties(Vector2.prototype, {

        fromVector2: {
            value: function (v) {                                        
                return Vector2.fromVector2(v, this);
            }
        },

        set: {
            value: function (x, y) {
                return Vector2.set(this, x, y);
            }
        },

        transformFromMat2: {
            value: function (m) {
                return Vector2.transformFromMat2(this, m, this);
            }
        }
    });

    //Vector3

    /// private ctor
    function _Vector3(data) {
        PropertyData.call(this, data);
        PropertyXY.call(this, data);
        PropertyZ.call(this, data);
    }

    /// public ctor
    function Vector3(x, y, z) {

        if (x == null)
            x = 0.0;
        if (y == null)
            y = 0.0;
        if (z == null)
            z = 0.0;

        var data = vec3.fromValues(x, y, z);
        _Vector3.call(this, data);
    }

    initConstructor(Vector3, _Vector3, vec3, Vector, VectorPrototype);

    Object.defineProperties(Vector3, {

        fromVector3: {
            value: function (v, out) {                    
                out = createIfNull(vec3, _Vector3, out);
                out.set(v.x, v.y, v.z);
                return out;
            }
        },

        fromVector4: {
            value: function (v, out) {
                out = createIfNull(vec3, _Vector3, out);
                out.set(v.x, v.y, v.z);
                return out;
            }
        },
                        
        set : {
            value: function (v, x, y, z) {
                vec3.set(v.data, x, y, z);
                return v;
            }
        },

        cross: {
            value: function (v1, v2, out) {
                out = createIfNull(vec3, _Vector3, out);
                vec3.cross(out.data, v1.data, v2.data);
                return out;
            }
        },
            
        transformDirection: {
            value: function (v, m, out) {
                out = createIfNull(vec3, _Vector3, out);
                var v = Vector4.directionFromVector3(v);
                v.transformMat4(m);
                out.fromVector4(v);
                return out;
            }
        }

    });

    Object.defineProperties(Vector3.prototype, {

        fromVector3: {
            value: function (v) {                    
                return Vector3.fromVector3(v, this);
            }
        },

        fromVector4: {
            value: function (v) {
                return Vector3.fromVector4(v, this);
            }
        },

        set: {
            value: function (x, y, z) {
                return Vector3.set(this, x, y, z);
            }
        },

        cross: {
            value: function (v) {
                return Vector3.cross(this, v, this);
            }
        },

        transformDirection: {
            value: function (m) {
                return Vector3.transformDirection(this, m, this);
            }
        }
    });


    //Vector4

    /// private ctor
    function _Vector4(data) {
        PropertyData.call(this, data);
        PropertyXY.call(this, data);
        PropertyZ.call(this, data);
        PropertyW.call(this, data);
    }

    //public ctor
    function Vector4(x, y, z, w) {

        if (x == null)
            x = 0.0;
        if (y == null)
            y = 0.0;
        if (z == null)
            z = 0.0;
        if (w == null)
            w = 0.0;

        var data = vec4.fromValues(x, y, z, w);
        _Vector4.call(this, data);
    }

    initConstructor(Vector4, _Vector4, vec4, Vector, VectorPrototype);

    defineSetXYZW(Vector4);

    Object.defineProperties(Vector4, {

        fromVector4: {
            value: function (v, out) {
                out = createIfNull(vec4, _Vector4, out);
                out.set(v.x, v.y, v.z, v.w);
                return out;
            }
        },           
            
        pointFromVector3: {
            value: function (v, out) {
                out = createIfNull(vec4, _Vector4, out);
                out.set(v.x, v.y, v.z, 1.0);                    
                return out;
            }
        },

        directionFromVector3: {
            value: function (v, out) {
                out = createIfNull(vec4, _Vector4, out);
                out.set(v.x, v.y, v.z, 0.0);                    
                return out;
            }
        }
    });

    Object.defineProperties(Vector4.prototype, {

        fromVector4: {
            value: function (v) {
                return Vector4.fromVector4(v, this);
            }
        },

        pointFromVector3: {
            value: function (v) {
                return Vector4.pointFromVector3(v, this);
            }
        },

        directionFromVector3: {
            value: function (v) {
                return Vector4.directionFromVector3(v, this);
            }
        }
    });


    function defineSetXYZW(ctor) {
        Object.defineProperty(ctor, 'set', {
            value: function (v, x, y, z, w) {
                vec4.set(v.data, x, y, z, w);
                return v;
            }
        });

        Object.defineProperty(ctor.prototype, 'set', {
            value: function (x, y, z, w) {
                return ctor.set(this, x, y, z, w);
            }
        });
    }

    function getElement(data, index) {
        return data[index];
    }

    function setElement(data, index, v) {
        data[index] = v;
    }
        
    function Matrix(namespace, privateCtor) {

        Object.defineProperties(this, {
            identity: {
                value: function (out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.identity(out.data);
                    return out;
                }
            },

            invert: {
                value: function (m, out) {
                    out = createIfNull(namespace, privateCtor, out);
                    namespace.invert(out.data, m.data);
                    return out;
                }
            }               

        });

        if (namespace != quat)
            Object.defineProperties(this, {                    

                getElement: {
                    value: function (m, index) {                            
                        return getElement(m.data, index);                            
                    }
                },

                setElement:{
                    value: function (m, index, v) {
                        setElement(m.data, index, v);
                    }
                },

                determinant: {
                    value: function (m) {
                        return namespace.determinant(m.data);
                    }
                },

                rotate: {
                    value: function (m, rad, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.rotate(out.data, m.data, rad);
                        return out;
                    }
                },

                scale: {
                    value: function (m, v, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.scale(out.data, m.data, v.data);
                        return out;
                    }
                },

                transpose: {
                    value: function (m, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.transpose(out.data, m.data);
                        return out;
                    }
                }
            });


        if (namespace == mat3 || namespace == mat4)
            Object.defineProperties(this, {
                fromQuat: {
                    value: function (q, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.fromQuat(out.data, q.data);
                        return out;
                    }
                },

                translate: {
                    value: function (m, v, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.translate(out.data, m.data, v.data);
                        return out;
                    }
                }
            });

        if (namespace == mat4 || namespace == quat)
            Object.defineProperties(this, {

                rotateX: {
                    value: function (e, rad, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.rotateX(out.data, e.data, rad);
                        return out;
                    }
                },

                rotateY: {
                    value: function (e, rad, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.rotateY(out.data, e.data, rad);
                        return out;
                    }
                },

                rotateZ: {
                    value: function (e, rad, out) {
                        out = createIfNull(namespace, privateCtor, out);
                        namespace.rotateZ(out.data, e.data, rad);
                        return out;
                    }
                }
            });
    }

    function MatrixPrototype(namespace, ctor) {

        Object.defineProperties(this, {
            identity: {
                value: function () {
                    return ctor.identity(this);
                }
            },

            invert: {
                value: function () {
                    return ctor.invert(this, this);
                }
            }                
        });

        if (namespace != quat)
            Object.defineProperties(this, {

                getElement: {
                    value: function (index) {                            
                        return ctor.getElement(this, index);
                    }
                },

                setElement:{
                    value: function (index, v) {
                        ctor.setElement(this, index, v);
                    }
                },

                determinant: {
                    value: function () {
                        return ctor.determinant(this);
                    }
                },

                rotate: {
                    value: function (rad) {
                        return ctor.rotate(this, rad, this);
                    }
                },

                scale: {
                    value: function (v) {
                        return ctor.scale(this, v, this);
                    }
                },

                transpose: {
                    value: function () {
                        return ctor.transpose(this, this);
                    }
                }
            });

        if (namespace == mat3 || namespace == mat4)
            Object.defineProperties(this, {

                fromQuat: {
                    value: function (q) {
                        return ctor.fromQuat(q, this);
                    }
                },

                translate: {
                    value: function (v) {
                        return ctor.translate(this, v, this);
                    }
                }
            });

        if (namespace == mat3 || namespace == mat4)
            Object.defineProperties(this, {

                rotateX: {
                    value: function (rad) {
                        return ctor.rotateX(this, rad, this);
                    }
                },

                rotateY: {
                    value: function (rad) {
                        return ctor.rotateY(this, rad, this);
                    }
                },

                rotateZ: {
                    value: function (rad) {
                        return ctor.rotateZ(this, rad, this);
                    }
                }
            });
    }

                
    function copyElements(src, dst, size) {
        for (var i = 0 ; i < size ; i++)
            dst[i] = src[i];
    }
         
    function buildMatrixElements(namespace, elements) {
        var data;

        if (elements != null) {
            data = new Float32Array(elements);
            namespace.transpose(data, data);
        } else
            data = namespace.create();
            
        return data;
    }

    function _Matrix2(data) {
        PropertyData.call(this, data);
    }

    function Matrix2(elements) {
        var data = buildMatrixElements(mat2, elements);            
        _Matrix2.call(this, data);
    }

    initConstructor(Matrix2, _Matrix2, mat2, Matrix, MatrixPrototype);

    Object.defineProperties(Matrix2, {
            
        fromMat2: {
            value: function (m ,out) {
                out = createIfNull(mat2, _Matrix2, out);
                copyElements(m.data, out.data, 4);                    
                return out;
            }
        },

        getRow: {
            value: function (m, index, out) {
                out = createIfNull(vec2, _Vector2, out);                    
                out.set(m.getElement(index),m.getElement(index + 2));
                return out;
            }
        },

        setRow: {
            value: function (m, index, v) {                    
                m.setElement(index, v.x);
                m.setElement(index + 2, v.y);
                return m;
            }
        },

        getColumn: {
            value: function (m, index, out) {
                out = createIfNull(vec2, _Vector2, out);
                index *= 2;
                out.set(m.getElement(index), m.getElement(index + 1));
                return out;
            }
        },

        setColumn: {
            value: function (m, index, v) {
                index *= 2;
                m.setElement(index, v.x);
                m.setElement(index + 1, v.y);
                return m;
            }
        }

    });

    Object.defineProperties(Matrix2.prototype, {

        fromMat2: {
            value: function (m) {
                return Matrix2.fromMat2(m, this);
            }
        },

        getRow: {
            value: function (index, out) {
                return Matrix2.getRow(this, index, out);
            }
        },

        setRow :{
            value: function (index, v) {
                return Matrix2.setRow(this, index, v);
            }
        },

        getColumn: {
            value: function (index, out) {
                return Matrix2.getColumn(this, index, out);
            }
        },

        setColumn: {
            value: function (index, v) {
                return Matrix2.setColumn(this, index, v);
            }
        }

    });

    function _Matrix3(data) {
        PropertyData.call(this, data);
    }

    function Matrix3(elements) {
        var data = buildMatrixElements(mat3, elements);            
        _Matrix3.call(this, data);
    }

    initConstructor(Matrix3, _Matrix3, mat3, Matrix, MatrixPrototype);

    Object.defineProperties(Matrix3, {

        fromMat3 : {
            value: function (m, out) {
                out = createIfNull(mat3, _Matrix3, out);
                copyElements(m.data, out.data, 9);
                return out;
            }
        },

        fromMat4: {
            value: function (m, out) {
                out = createIfNull(mat3, _Matrix3, out);
                mat3.fromMat4(out.data, m.data);
                return out;
            }
        },

        normalFromMat4: {
            value: function (m, out) {
                out = createIfNull(mat3, _Matrix3, out);
                mat3.normalFromMat4(out.data, m.data);
                return out;
            }
        },

        getRow: {
            value: function (m, index, out) {
                out = createIfNull(vec3, _Vector3, out);
                out.set(m.getElement(index), m.getElement(index + 3), m.getElement(index + 6));
                return out;
            }
        },

        setRow: {
            value: function (m, index, v) {
                m.setElement(index, v.x);
                m.setElement(index + 3, v.y);
                m.setElement(index + 6, v.z);
                return m;
            }
        },

        getColumn: {
            value: function (m, index, out) {
                out = createIfNull(vec3, _Vector3, out);
                index *= 3;
                out.set(m.getElement(index), m.getElement(index + 1), m.getElement(index + 2));
                return out;
            }
        },

        setColumn: {
            value: function (m, index, v) {
                index *= 3;
                m.setElement(index, v.x);
                m.setElement(index + 1, v.y);
                m.setElement(index + 2, v.z);
                return m;
            }
        }

    });

    Object.defineProperties(Matrix3.prototype, {

        fromMat3: {
            value: function (m) {
                return Matrix3.fromMat3(m, this);
            }
        },

        fromMat4: {
            value: function (m) {
                return Matrix3.fromMat4(m, this);
            }
        },

        normalFromMat4: {
            value: function (m) {
                return Matrix3.normalFromMat4(m, this);
            }
        },

        getRow: {
            value: function (index, out) {
                return Matrix3.getRow(this, index, out);
            }
        },

        setRow :{
            value: function (index, v) {
                return Matrix3.setRow(this, index, v);
            }
        },

        getColumn: {
            value: function (index, out) {
                return Matrix3.getColumn(this, index, out);
            }
        },

        setColumn: {
            value: function (index, v) {
                return Matrix3.setColumn(this, index, v);
            }
        }

    });


    function _Matrix4(data) {
        PropertyData.call(this, data);
    }

    function Matrix4(elements) {
        var data = buildMatrixElements(mat4, elements);
        _Matrix4.call(this, data);            
    }

    initConstructor(Matrix4, _Matrix4, mat4, Matrix, MatrixPrototype);

    Object.defineProperties(Matrix4, {

        fromMat4 : {
            value: function (m, out) {
                out = createIfNull(mat4, _Matrix4, out);
                copyElements(m.data, out.data, 16);
                return out;
            }
        },

        fromRotationTranslation: {
            value: function (q, v, out) {
                out = createIfNull(mat4, _Matrix4, out);
                mat4.fromRotationTranslation(out.data, q.data, v.data);
                return out;
            }
        },

        frustum: {
            value: function (left, right, bottom, top, near, far, out) {
                out = createIfNull(mat4, _Matrix4, out);
                mat4.frustum(out.data, left, right, bottom, top, near, far);
                return out;
            }
        },

        lookAt: {
            value: function (eye, center, up, out) {
                out = createIfNull(mat4, _Matrix4, out);
                mat4.lookAt(out.data, eye.data, center.data, up.data);
                return out;
            }
        },

        ortho: {
            value: function (left, right, bottom, top, near, far, out) {
                out = createIfNull(mat4, _Matrix4, out);
                mat4.ortho(out.data, left, right, bottom, top, near, far);
                return out;
            }
        },

        perspective: {
            value: function (fovy, aspect, near, far, out) {
                out = createIfNull(mat4, _Matrix4, out);
                mat4.perspective(out.data, fovy, aspect, near, far);
                return out;
            }
        },

        getRow: {
            value: function (m, index, out) {
                out = createIfNull(vec4, _Vector4, out);
                out.set(m.getElement(index), m.getElement(index + 4), m.getElement(index + 8), m.getElement(index + 12));
                return out;
            }
        },

        setRow: {
            value: function (m, index, v) {
                m.setElement(index, v.x);
                m.setElement(index + 4, v.y);
                m.setElement(index + 8, v.z);
                m.setElement(index + 12, v.w);
                return m;
            }
        },

        getColumn: {
            value: function (m, index, out) {
                out = createIfNull(vec4, _Vector4, out);
                index *= 4;
                out.set(m.getElement(index), m.getElement(index + 1), m.getElement(index + 2), m.getElement(index + 3));
                return out;
            }
        },

        setColumn: {
            value: function (m, index, v) {
                index *= 4;
                m.setElement(index, v.x);
                m.setElement(index + 1, v.y);
                m.setElement(index + 2, v.z);
                m.setElement(index + 3, v.w);
                return m;
            }
        },

        getMaxScale: {
            value: (function (m) {

                var column4 = new Vector4();
                                                        
                return function (m) {
                    var maxScale = Number.NEGATIVE_INFINITY;

                    for (var i = 0 ; i < 3; i++) {
                        m.getColumn(i, column4);                        
                        var data = column4.data;
                        var x = data[0];
                        var y = data[1];
                        var z = data[2];                        
                        maxScale = Math.max(maxScale, x*x + y*y + z*z);
                    }

                    return Math.sqrt(maxScale);
                };

            })()
        }
    });

    Object.defineProperties(Matrix4.prototype, {

        fromMat4: {
            value: function (m) {
                return Matrix4.fromMat4(m, this);
            }
        },

        fromRotationTranslation: {
            value: function (q, v) {
                return Matrix4.fromRotationTranslation(q, v, this);
            }
        },

        frustum: {
            value: function (left, right, bottom, top, near, far) {
                return Matrix4.frustum(left, right, bottom, top, near, far, this);
            }
        },

        lookAt: {
            value: function (eye, center, up) {
                return Matrix4.lookAt(eye, center, up, this);
            }
        },

        ortho: {
            value: function (left, right, bottom, top, near, far) {
                return Matrix4.ortho(left, right, bottom, top, near, far, this);
            }
        },

        perspective: {
            value: function (fovy, aspect, near, far) {
                return Matrix4.perspective(fovy, aspect, near, far, this);
            }
        },

        getRow: {
            value: function (index, out) {
                return Matrix4.getRow(this, index, out);
            }
        },

        setRow:{
            value : function(index, v){
                return Matrix4.setRow(this, index, v);
            }
        },

        getColumn: {
            value: function (index, out) {
                return Matrix4.getColumn(this, index, out);
            }
        },

        setColumn: {
            value: function (index, v) {
                return Matrix4.setColumn(this, index, v);
            }
        },

        getMaxScale: {
            value: function () {
                return Matrix4.getMaxScale(this);
            }
        }
    });

    function _Quaternion(data) {
        PropertyData.call(this, data);
        PropertyXY.call(this, data);
        PropertyZ.call(this, data);
        PropertyW.call(this, data);
    }

    //public ctor
    function Quaternion(x, y, z, w) {

        if (x == null)
            x = 0.0;
        if (y == null)
            y = 0.0;
        if (z == null)
            z = 0.0;
        if (w == null)
            w = 1.0;

        var data = quat.fromValues(x, y, z, w);
        _Quaternion.call(this, data);
    }

    initConstructor(Quaternion, _Quaternion, quat, [Vector, Matrix], [VectorPrototype, MatrixPrototype]);
    defineSetXYZW(Quaternion);
        
    Object.defineProperties(Quaternion, {
                        
        fromQuat : {
            value: function (q, out) {
                out = createIfNull(quat, _Quaternion, out);
                out.set(q.x, q.y, q.z, q.w);
                return out;
            }
        },

        calculateW: {
            value: function (q, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.calculateW(out.data, q.data);
                return out;
            }
        },

        conjugate: {
            value: function (q, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.conjugate(out.data, q.data);
                return out;
            }
        },

        fromMat3: {
            value: function (m, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.fromMat3(out.data, m.data);
                return out;
            }
        },

        rotationTo: {
            value: function (v1, v2, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.rotationTo(out.data, v1.data, v2.data);
                return out;
            }
        },

        setAxes: {
            value: function (view, right, up, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.setAxes(out.data, view.data, right.data, up.data);
                return out;
            }
        },

        setAxisAngle: {
            value: function (axis, rad, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.setAxisAngle(out.data, axis.data, rad);
                return out;
            }
        },

        slerp: {
            value: function (q1, q2, t, out) {
                out = createIfNull(quat, _Quaternion, out);
                quat.slerp(out.data, q1.data, q2.data, t);
                return out;
            }
        }
    });

    Object.defineProperties(Quaternion.prototype, {

        fromQuat : {
            value: function (q) {
                return Quaternion.fromQuat(q, this);
            }
        },

        calculateW: {
            value: function () {
                return Quaternion.calculateW(this, this);
            }
        },

        conjugate: {
            value: function () {
                return Quaternion.conjugate(this, this);
            }
        },

        fromMat3: {
            value: function (m) {
                return Quaternion.fromMat3(m, this);
            }
        },

        rotationTo: {
            value: function (v1, v2) {
                return Quaternion.rotationTo(v1, v2, this);
            }
        },

        setAxes: {
            value: function (view, right, up) {
                return Quaternion.setAxes(view, right, up, this);
            }
        },

        setAxisAngle: {
            value: function (axis, rad) {
                return Quaternion.setAxisAngle(axis, rad, this);
            }
        },

        slerp: {
            value: function (q2, t) {
                return Quaternion.slerp(this, q2, t, this);
            }
        }
    });

    function CommonArray(perElementCount, elementCount, elementCtor) {

        var elementStride = Float32Array.BYTES_PER_ELEMENT * perElementCount;
        var data = new ArrayBuffer(elementCount * elementStride);

        var view = new Float32Array(data);
        var views = new Array(elementCount);
        var elements = new Array(elementCount);
                        
        for (var i = 0 ; i < elementCount; i++) {
            var elementView = new Float32Array(data, elementStride * i, perElementCount);
            views[i] = elementView;
            elements[i] = new elementCtor(elementView);
        }

        PropertyData.call(this, view);

        Object.defineProperties(this, {

            length : {
                value : elementCount
            },

            get: {
                value: function (i) {
                    return elements[i];
                }
            },

            forEach: {
                value: function (fun) {
                    for (var i = 0 ; i < elementCount ; i++)
                        fun(i, elements[i]);
                }
            }
        });
    }

    function initIdentity(i, v) {
        v.identity();
    }

    function Vector2Array(count) {
        CommonArray.call(this, 2, count, _Vector2);
    }

    function Vector3Array(count) {
        CommonArray.call(this, 3, count, _Vector3);
    }

    function Vector4Array(count) {
        CommonArray.call(this, 4, count, _Vector4);
    }

    function Matrix2Array(count) {
        CommonArray.call(this, 4, count, _Matrix2);
        this.forEach(initIdentity);
    }

    function Matrix3Array(count) {
        CommonArray.call(this, 9, count, _Matrix3);
        this.forEach(initIdentity);
    }

    function Matrix4Array(count) {
        CommonArray.call(this, 16, count, _Matrix4);
        this.forEach(initIdentity);
    }

    function QuaternionArray(count) {
        CommonArray.call(this, 4, count, _Quaternion);
        this.forEach(initIdentity);
    }

    var epsilon = 0.000001;

    var Utils = {

        equalsFloat: function (f1, f2) {
            return Math.abs(f1 - f2) < epsilon;
        }
    };
    
    return Object.freeze( {
        Vector2: Vector2,
        Vector3: Vector3,

        xAxis: new Vector3(1.0, 0.0, 0.0),
        yAxis: new Vector3(0.0, 1.0, 0.0),
        zAxis: new Vector3(0.0, 0.0, 1.0),

        xAxisNeg: new Vector3(-1.0, 0.0, 0.0),
        yAxisNeg: new Vector3(0.0, -1.0, 0.0),
        zAxisNeg : new Vector3(0.0, 0.0, -1.0),

        Vector4: Vector4,

        xAxis4: new Vector4(1.0, 0.0, 0.0, 0.0),
        yAxis4: new Vector4(0.0, 1.0, 0.0, 0.0),
        zAxis4: new Vector4(0.0, 0.0, 1.0, 0.0),

        xAxisNeg4: new Vector4(-1.0, 0.0, 0.0, 0.0),
        yAxisNeg4: new Vector4(0.0, -1.0, 0.0, 0.0),
        zAxisNeg4: new Vector4(0.0, 0.0, -1.0, 0.0),

        Matrix2: Matrix2,
        Matrix3: Matrix3,
        Matrix4: Matrix4,
        Quaternion: Quaternion,
        Vector2Array: Vector2Array,
        Vector3Array: Vector3Array,
        Vector4Array: Vector4Array,
        Matrix2Array: Matrix2Array,
        Matrix3Array: Matrix3Array,
        Matrix4Array: Matrix4Array,
        QuaternionArray: QuaternionArray,
        Utils: Utils
    });

});
  