define(['./EventTarget', './Pools'], function (EventTarget, Pools) {

    'use strict';

    var ImageFormat = Object.freeze({        
        RGB: 0,
        RGBA: 1
    });

    var ImageDataType = Object.freeze({
        UNSIGNED_BYTE: 0
    });

    var TextureFilter = Object.freeze({
        NEAREST: 0,
        LINEAR: 1,
        NEAREST_MIPMAP_NEAREST: 2,
        NEAREST_MIPMAP_LINEAR: 3,
        LINEAR_MIPMAP_NEAREST: 4,
        LINEAR_MIPMAP_LINEAR: 5
    });

    var TextureWrapMode = Object.freeze({
        REPEAT: 0,
        MIRRORED_REPEAT: 1,
        CLAMP_TO_EDGE: 2
    });

    var TextureType = Object.freeze({
        Texture: 0,
        TextureCube: 1,
        RenderTarget : 2
    });
                                
    var dataChangedEvent = 'dataChanged';
    var sizeChangedEvent = 'sizeChanged';
    var parametersChangedEvent = 'parametersChanged';
    var releasedEvent = 'released';
        
    function Texture(imageData, width, height, parameters) {

        if (width == null || height == null) {
            if (imageData == null)
                throw new Error('invalid parameter');

            width = imageData.width;
            height = imageData.height;

            if (width == null || height == null)
                throw new Error('invalid parameter');
        }

        //image attributes
        var imageFormat;
        var imageDataType;
        var flipY;

        var magnification;
        var minification;
        var wrapS;
        var wrapT;
        var mipmap;
        var useMipMap;

        if (parameters != null) {

            imageFormat = parameters.imageFormat;
            imageDataType = parameters.imageDataType;

            //set up filters and wrap mode if provided
            magnification = parameters.magnification;
            minification = parameters.minification;
            wrapS = parameters.wrapS;
            wrapT = parameters.wrapT;

            //check provided mipmaps
            mipmap = parameters.mipmap;
            useMipMap = parameters.useMipMap;

            if (imageData == null && mipmap != null)
                throw new Error('invalid parameter');

            //flip image Y-axis
            flipY = parameters.flipY;
        }

        EventTarget.call(this);

        //set up default values if not provided
        if (imageFormat == null)
            imageFormat = ImageFormat.RGBA;
        if (imageDataType == null)
            imageDataType = ImageDataType.UNSIGNED_BYTE;
        if (magnification == null)
            magnification = TextureFilter.LINEAR;
        if (minification == null)
            minification = TextureFilter.NEAREST_MIPMAP_LINEAR;
        if (wrapS == null)
            wrapS = TextureWrapMode.REPEAT;
        if (wrapT == null)
            wrapT = TextureWrapMode.REPEAT;
        if (useMipMap == null)
            useMipMap = true;
        if (flipY == null)
            flipY = true;
                        
        var released = false;

        Object.defineProperties(this, {

            imageData: {
                get: function(){
                    return imageData;
                },
                set : function(v){
                    imageData = v;
                    this.trigger(dataChangedEvent);
                },
                configurable : true
            },

            width: {
                get : function(){
                    return width;
                },

                set: function(v){
                    width = v;
                    this.trigger(sizeChangedEvent);
                },
                configurable : true
            },

            height: {
                get : function(){
                    return height;
                },
                set : function(v){
                    height = v;
                    this.trigger(sizeChangedEvent);
                },
                configurable: true
            },

            powerOfTwo : {
                get: function () {
                    return isPowerOfTwo(width) && isPowerOfTwo(height);
                },
                configurable : true
            },

            imageFormat: {
                get: function(){
                    return imageFormat;
                },
                set : function(v){
                    imageFormat = v;
                    this.trigger(dataChangedEvent);
                },
                configurable: true
            },

            imageDataType: {
                get : function(){
                    return imageDataType;
                },
                set : function(v){
                    imageDataType = v;
                    this.trigger(dataChangedEvent);
                },
                configurable: true
            },

            flipY: {
                get: function(){
                    return flipY;
                },
                set:function(v){
                    flipY = v;
                    this.trigger(parametersChangedEvent);
                    this.trigger(dataChangedEvent);
                },
                configurable: true
            },

            mipmap: {
                get: function(){
                    return mipmap;
                },
                set : function(v){
                    mipmap = v;
                    this.trigger(dataChangedEvent);
                },
                configurable: true
            },

            useMipMap : {
                value: useMipMap,
                configurable : true
            },

            magnification: {

                get: function () {
                    return magnification;
                },

                set : function(v){
                    magnification = v;
                    this.trigger(parametersChangedEvent);
                },
                configurable: true
            },

            minification: {

                get: function () {
                    return minification;
                },

                set : function(v){
                    minification = v;
                    this.trigger(parametersChangedEvent);
                },
                configurable: true
            },

            wrapS: {

                get: function () {
                    return wrapS;
                },

                set:function(v){
                    wrapS = v;
                    this.trigger(parametersChangedEvent);
                },
                configurable: true
            },

            wrapT: {

                get: function () {
                    return wrapT;
                },

                set:function(v){
                    wrapT = v;
                    this.trigger(parametersChangedEvent);
                },
                configurable: true
            },

            release: {
                value: function () {
                    if (released)
                        return;
                    released = true;
                    this.trigger(releasedEvent);
                    imageData = null;
                    mipmap = null;
                    parameters = null;                    
                    texturePool.release(this);
                },
                configurable : true
            }
        });
    }

    Texture.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(Texture.prototype, {

        constructor: { value: Texture },

        type: {
            value : TextureType.Texture
        },

        clone: {
            value: function () {
                var parameters = getParameters(this);
                return texturePool.get(this.imageData, this.width, this.height, parameters);                    
            }
        }
        
    });    

                                
    function TextureCube(imagesData, width, height, parameters) {

        if (imagesData != null && (!(imagesData instanceof Array) || imagesData.length !== 6))
            throw new Error('invalid parameter');
            
        (function () {
            if (parameters != null) {
                var mipmap = parameters.mipmap;
                if (mipmap != null && (!(mipmap instanceof Array) || mipmap.length !== 6))
                    throw new Error('invalid parameter');
                if (parameters.flipY == null)
                    parameters.flipY = false;
            } else 
                parameters = { flipY: false };
            
            if (width == null || height == null){           
                
                var first = imagesData[0];

                width = width != null ? width : first.width;
                height = height != null ? height : first.height;

                if (width == null || height == null)
                    throw new Error('invalid parameter');
            }
        })();            

        Texture.call(this, imagesData, width, height, parameters);

        var released = false;

        Object.defineProperty(this,'release',{

            value : function(){
                if(released)
                    return;
                released = true;
                this.trigger(releasedEvent);
                this.imageData = null;
                imagesData = null;
                this.mipmap = null;                    
                parameters = null;                
                textureCubePool.release(this);
            },
            configurable : true
        });
    }

    TextureCube.prototype = Object.create(Texture.prototype);
    Object.defineProperties(TextureCube.prototype, {

        constructor: { value: TextureCube },

        type: {
            value : TextureType.TextureCube
        },

        clone: {
            value: function () {
                var parameters = getParameters(this);
                return textureCubePool.get(this.imageData, this.width, this.height, parameters);
            }
        }
    });

    function getParameters(texture) {
        return {
            imageFormat: texture.imageFormat,
            imageDataType: texture.imageDataType,
            magnification: texture.magnification,
            minification: texture.minification,
            wrapS: texture.wrapS,
            wrapT: texture.wrapT,
            mipmap: texture.mipmap,
            useMipMap : texture.useMipMap,
            flipY: texture.flipY
        };
    }
        
    function isPowerOfTwo(x) {
        return (x & (x - 1)) == 0;
    }
                
    var CubeMapFace = Object.freeze({
        POSITIVE_X: 0,
        NEGATIVE_X: 1,
        POSITIVE_Y: 2,
        NEGATIVE_Y: 3,
        POSITIVE_Z: 4,
        NEGATIVE_Z: 5
    });
                
    function RenderTarget(colorTexture, cubeMapFace, generateMipMaps) {

        if (colorTexture == null || (colorTexture instanceof TextureCube && cubeMapFace == null))
            throw new Error('invalid parameter');

        EventTarget.call(this);
                
        generateMipMaps = generateMipMaps != null ? generateMipMaps : true;

        var released = false;

        var onColorTextureReleased = (function () {
            var _this = this;
            return function() {
                _this.release();                    
            };
        }).call(this);

        colorTexture.addEventListener(releasedEvent,onColorTextureReleased);

        Object.defineProperties(this, {

            colorTexture: {
                get : function(){
                    return colorTexture;
                },
                configurable : true
            },

            cubeMapFace: {
                value: cubeMapFace,
                configurable : true
            },

            generateMipMaps:{
                get: function () {
                    return generateMipMaps;
                },
                set: function (v) {
                    generateMipMaps = v;                        
                },
                configurable : true
            },

            release: {
                value: function () {
                    if (released) 
                        return;
                    released = true;
                    colorTexture.removeEventListener(releasedEvent, onColorTextureReleased);
                    this.trigger(releasedEvent);
                    renderTargetPool.release(this);                                         
                },
                configurable : true
            }
        });
    }

    RenderTarget.prototype = Object.create(EventTarget.prototype);
    Object.defineProperties(RenderTarget.prototype, { 

        constructor: { value: RenderTarget },

        type: {
            value : TextureType.RenderTarget
        },

        clone: {
            value: function () {                
                return renderTargetPool.get(this.colorTexture, this.cubeMapFace, this.generateMipMaps);
            }
        }

    });

    var texturePool = Pools.createObjectPool(Texture, false);
    var textureCubePool = Pools.createObjectPool(TextureCube, false);
    var renderTargetPool = Pools.createObjectPool(RenderTarget, false);

    return Object.freeze({

        ImageDataType: ImageDataType,
        ImageFormat: ImageFormat,
        TextureFilter: TextureFilter,
        TextureWrapMode : TextureWrapMode,
        TextureType : TextureType,

        createTexture: function (imageData, width, height, parameters) {                
            return texturePool.get(imageData, width, height, parameters);
        },

        createTextureCube: function (imagesData, width, height, parameters) {                
            return textureCubePool.get(imagesData, width, height, parameters);
        },

        CubeMapFace: CubeMapFace,

        createRenderTarget: function (colorTexture, cubeMapFace, generateMipMaps) {                
            return renderTargetPool.get(colorTexture, cubeMapFace, generateMipMaps);
        }          

    });

});
