define(['core/VMath'], function (VMath) {

    var InterpolationType = Object.freeze({LINEAR : 0});
    
    function NumberLinearInterpolator(f1, f2, t, out) {
        if (t == 1.0)
            return f2;
        else if (t == 0.0)
            return f1;
        return (1.0 - t) * f1 + t * f2;
    }

    function VectorLinearInterpolator(v1, v2, t, out, fromFun) {        
        if (t == 1.0)
            out[fromFun](v2);
        else {
            out[fromFun](v1);
            if (t != 0.0)
                out.lerp(v2, t);
        }
        return out;
    }

    function Vector2LinearInterpolator(v1, v2, t, out) {
        return VectorLinearInterpolator(v1, v2, t, out, 'fromVector2');
    }

    function Vector3LinearInterpolator(v1, v2, t, out) {
        return VectorLinearInterpolator(v1, v2, t, out, 'fromVector3');
    }

    function Vector4LinearInterpolator(v1, v2, t, out) {
        return VectorLinearInterpolator(v1, v2, t, out, 'fromVector4');
    }  

    function QuaternionSphericalLinearInterpolator(q1, q2, t, out) {        
        if (t == 1.0)
            out.fromQuat(q2);
        else {
            out.fromQuat(q1);
            if (t != 0.0)
                out.slerp(q2, t);
        }
        return out;
    }

    function get(ctor, type) {
        switch (ctor) {
            case VMath.Vector2:
                return Vector2LinearInterpolator;
            case VMath.Vector3:
                return Vector3LinearInterpolator;
            case VMath.Vector4:
                return Vector4LinearInterpolator;
            case VMath.Quaternion:
                return QuaternionSphericalLinearInterpolator;
            case Number:
                return NumberLinearInterpolator;
            default:
                throw new Error('invalid constructor');
        }
    }

    return Object.freeze({
        get : get,
        InterpolationType : InterpolationType,
        NumberLinearInterpolator: NumberLinearInterpolator,
        Vector2LinearInterpolator: Vector2LinearInterpolator,
        Vector3LinearInterpolator: Vector3LinearInterpolator,
        Vector4LinearInterpolator: Vector4LinearInterpolator,
        QuaternionSphericalLinearInterpolator: QuaternionSphericalLinearInterpolator
    });
});