define(['./EventTarget', './Rectangles', './States', './Buffers',
    './Textures', './Shaders', './DataType', './Pools', './PrimitiveTopology', './ProgramVariables', 'Utils'],

    function (EventTarget, Rectangles, States, Buffers, Textures, Shaders, DataType, Pools, PrimitiveTopology, ProgramVariables, Utils) {

        'use strict';

        var contextLostEvent = 'contextLost';
        var contextRestoredEvent = 'contextRestored';
        var resizeEvent = 'resize';
    
        function Device(canvas) {

            EventTarget.call(this);
         
            var gl = getContext(canvas);

            var state = {

                device : this,
                gl: gl,
                canvas: canvas,

                //initialized resources
                buffers: null,
                textures: null,                
                programs: null,
                programsVariables : null,
                shaders: null,
                renderTargets: null,

                //current bindings
                boundBuffers: null,
                boundProgram: null,
                boundTextures: null,
                boundRenderTarget: null,
            
                //vertex attributes bindings
                attributeBufferMap: null,
                enabledAttributes: null,
                attributeBindings: null,
                pendingInstancingBindings: null,
                
                newlyEnabledAttributes: null,                                       
                pendingBindings: null,

                //texture units bindings
                activeTextureUnit: null,
                defaultActiveTextureUnit: null,
                textureUnitMap: null,
                textureUnitArrayCtor: null,

                //texture parameters
                defaultMagnification: null,
                defaultMinification: null,
                defaultWrapS: null,
                defaultWrapT: null,
                defaultFlippedY: null,
                cubeMapFaces: null,
                flippedY: null,

                //current pipeline bindings
                currVertexBuffers: null,
                currIndexBuffer: null,
                currProgram: null,
                currRenderTarget: null,

                currIndexType: null,
                currIndexSize: 0,

                currMaxVertexCount: 0,
                currMaxIndexCount: 0,

                vertexBuffersChanged: false,
                indexBufferChanged: false,
                programChanged: false,
                renderTargetChanged: false,
                
                defaultViewPort: null,
                currViewPort: null,
                newViewPort: null,

                defaultScissor: null,
                currScissor: null,
                newScissor : null,

                defaultPrimitiveTopology: null,
                currPrimitiveTopology: null,
                
                //blending
                defaultBlendState: null,
                currBlendState: null,
                newBlendState : null,
                blendMode: null,            

                defaultBlendRGBSrcFunc: null,
                currBlendRGBSrcFunc: null,

                defaultBlendRGBDestFunc: null,
                currBlendRGBDestFunc: null,            

                defaultBlendRGBEq: null,
                currBlendRGBEq: null,            

                defaultBlendAlphaSrcFunc: null,
                currBlendAlphaSrcFunc: null,

                defaultBlendAlphaDestFunc: null,
                currBlendAlphaDestFunc: null,
            
                defaultBlendAlphaEq :null,
                currBlendAlphaEq : null,
            
                //depth
                defaultDepthState: null,
                currDepthState: null,
                newDepthState : null,
                        
                //face culling
                defaultCullState: null,
                currCullState: null,
                newCullState : null,            
                       
                defaultClearColor: null,
                clearColor: null,
                defaultClearDepth: null,
                clearDepth: null,
                pendingClearColor: false,
                pendingClearDepth: false,

                //limits
                limits: {
                    MAX_COMBINED_TEXTURE_IMAGE_UNITS: null,
                    MAX_TEXTURE_SIZE: null,
                    MAX_CUBE_MAP_TEXTURE_SIZE: null,
                    MAX_RENDERBUFFER_SIZE: null                    
                },

                //extensions
                floatTextures_EXT: null,
                floatTexturesLinearFilter_EXT : false,
                floatRenderTarget_EXT: null,
                multipleRenderTargets_EXT: null,
                multipleRenderTargetsCount_EXT : 0                                       
            };
        
            setupContextLostHandling(gl, canvas, state);
            initDevice(state);

            Object.defineProperties(this, {
                                                
                //pipeline bindings

                /**
                 * sets the provided primitive topology, null can be used as the default primitive topology
                 */
                setPrimitiveTopology: {
                    value: function (primitiveTopology) {
                        setPrimitiveTopology(primitiveTopology, state);
                    }
                },

                /**
                 * sets the provided vertex buffers.
                 * vertexBuffers could be an array or a single vertex buffer, moreover a null value unsets
                 * the current vertex buffers         
                 */
                setVertexBuffers: {
                    value : function (vertexBuffers) {
                        setVertexBuffers(vertexBuffers, state);
                    }
                },

                /**
                 * sets the provided index buffer, a null value can be used to unset the current 
                 * index buffer
                 */
                setIndexBuffer : {
                    value : function (indexBuffer) {
                        setIndexBuffer(indexBuffer, state);
                    }
                },

                /**
                 * sets the provided program, a null value can be used to unset the current program
                */
                setProgram: {
                    value: function (program) {
                        setProgram(program, state);
                    }
                },
                                
                /**
                 * sets the provided viewport, null can be used as the default viewport
                 */                
                setViewPort: {
                    value: function (viewPort) {
                        setViewPort(gl, viewPort, state);
                    }
                },
                                
                /**
                 * sets the provided scissor, null can be used as the default scissor
                 */
                setScissor : {
                    value: function (scissor) {
                        setScissor(gl, scissor, state);
                    }
                },

                /**
                 * sets the provided render target, null can be used as the default render target
                 */
                setRenderTarget : {
                    value : function (renderTarget) {
                        setRenderTarget(gl, renderTarget, state);
                    }
                },                                

                /**
                 * sets the provided cull state, null can be used as the default cull state
                 */                
                setCullState: {
                    value: function (cullState) {
                        setCullState(cullState, state);
                    }
                },
                                
                /**
                 * sets the provided depth state, null can be used as the default depth state
                 */                
                setDepthState: {
                    value: function (depthState) {
                        setDepthState(depthState, state);
                    }
                },

                /**
                 * sets the provided blend state, null can be used as the default blend state
                 */                
                setBlendState : {
                    value : function (blendState) {
                        setBlendState(blendState, state);
                    }
                },

                /**
                * sets the color to clear the render target with 
                */
                setClearColor :{
                    value: function (color) {
                        setClearColor(gl, color, state);
                    }
                },

                /**
                * sets the depth value to clear the render target with
                */
                setClearDepth : {
                    value : function (depth) {
                        setClearDepth(gl, depth, state);
                    }
                },

                /**
                * combines setClearColor() and setClearDepth
                */
                setClearColorAndDepth :{
                    value : function (color, depth) {
                        setClearColorAndDepth(gl, color, depth, state);
                    }
                },
                
                /**
                * finalizes pipeline changes, it is necessary in order to make any set* function calls 
                * changes actually applied
                */
                apply :{
                    value: function () {
                        apply(gl, state);
                    }
                },
                
                //drawing

                /**
                * draws the current vertex buffer using all its vertices
                */
                draw: {
                    value: function () {
                        draw(gl, state);
                    }
                },

                /**
                * draws the current vertex buffer using the vertices subset provided
                */
                drawSubSet: {
                    value: function (startIndex, vertexCount) {
                        drawSubSet(gl, startIndex, vertexCount, state);
                    }
                },

                /**
                * draws the current vertex buffer using the vertices obtained by all the indices 
                * of the current index buffer
                */
                drawIndexed: {
                    value: function () {
                        drawIndexed(gl, state);
                    }
                },

                /**
                * draws the current vertex buffer using the vertices obtained by the provided indices subset 
                * of the current index buffer
                */
                drawIndexedSubSet: {
                    value: function (startIndex, indexCount) {
                        drawIndexedSubSet(gl, startIndex, indexCount, state);
                    }
                },

                /**
                * combines draw() and drawIndexed() : calls draw() if there is no current index buffer, calls 
                * drawIndexed() otherwise
                */
                drawAuto : {
                    value: function () {
                        drawAuto(gl, state);
                    }
                },

                /**
                * clear the color of the current render target with the current color on the next call of apply()
                */
                clearColor: {
                    value: function () {
                        clearColor(gl, state);
                    }
                },

                /**
                * clear the depth of the current render target with the current depth value on the next call of apply()
                */
                clearDepth: {
                    value: function () {
                        clearDepth(gl, state);
                    }
                },

                /**
                * combines clearColor() and clearDepth()
                */
                clearColorAndDepth: {
                    value: function () {
                        clearColorAndDepth(gl, state);
                    }
                },

                //utils

                /**
                 * sets the value of a program variable, if null no set is done
                 */
                setProgramVariable: {
                    value: function (program, name, value) {
                        setProgramVariable(gl, program, name, value, state);
                    }
                },

                /**
                * retrieves the set of ProgramVariable for a provided program
                */
                getProgramVariables: {
                    value: function (program) {
                        return getProgramVariables(gl, program, state);
                    }
                },
                
                /**
                * retrieves the default viewport and render target width
                */
                viewPortWidth: {
                    get: function () {
                        return state.defaultViewPort.width;
                    }
                },

                /**
                * retrieves the default viewport and render target height
                */
                viewPortHeight: {
                    get: function () {
                        return state.defaultViewPort.height;
                    }
                },

                /**
                * resize the default viewport and render target
                */
                resize: {
                    value: function (width, height) {
                        return resize(gl, width, height, state);                    
                    }
                }               
                
            });            
        }

        Device.prototype = Object.create(EventTarget.prototype);
        Object.defineProperty(Device.prototype, 'constructor', { value: Device });
        
        //INITIALIZATION 

        function initDevice(state) {
            var gl = state.gl;
            initDefault(gl, state);
            setDefault(gl, state);
        }

        //gets the default state according to the specs.
        function initDefault(gl, state) {

            //get the context limits
            var limits = state.limits;
            for (var key in limits)
                limits[key] = gl.getParameter(gl[key]);

            //texture units
            state.defaultActiveTextureUnit = gl.TEXTURE0;
            var maxTextureUnits = limits.MAX_COMBINED_TEXTURE_IMAGE_UNITS;
            state.textureUnitArrayCtor = Array;

            //texture parameters
            state.defaultMagnification = gl.LINEAR;
            state.defaultMinification = gl.NEAREST_MIPMAP_LINEAR;
            state.defaultWrapS = gl.REPEAT;
            state.defaultWrapT = gl.REPEAT;
            state.defaultFlippedY = false;

            state.cubeMapFaces = [
                gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_X,

                gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,

                gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ];

            //viewport
            var canvas = state.canvas;
            var canvasWidth = canvas.width;
            var canvasHeight = canvas.height;
            state.defaultViewPort = Rectangles.createViewPort(canvasWidth, canvasHeight, 0, 0);
            state.defaultScissor = Rectangles.createScissor(canvasWidth, canvasHeight, 0, 0);

            //face culling
            state.defaultCullState = States.CullState.NONE;

            //depth
            state.defaultDepthState = States.DepthState.NONE;

            //blending
            state.defaultBlendState = States.BlendState.NONE;
            state.defaultBlendAlphaEq = gl.FUNC_ADD;
            state.defaultBlendRGBEq = gl.FUNC_ADD;
            state.defaultBlendAlphaSrcFunc = gl.ONE;
            state.defaultBlendRGBSrcFunc = gl.ONE;
            state.defaultBlendAlphaDestFunc = gl.ZERO;
            state.defaultBlendRGBDestFunc = gl.ZERO;

            //primitive topology
            state.defaultPrimitiveTopology = PrimitiveTopology.TRIANGLES;

            //clear info
            state.defaultClearColor = [0.0, 0.0, 0.0, 0.0];
            state.defaultClearDepth = 1.0;
        }

        //sets the default state
        var setDefault = (function () {

            return function (gl, state) {

                //clean or initialize state
                resetState(state);

                state.activeTextureUnit = state.defaultActiveTextureUnit;
                state.flippedY = state.defaultFlippedY;

                var defaultViewPort = state.defaultViewPort;
                state.currViewPort = defaultViewPort;
                state.newViewPort = defaultViewPort;

                var defaultScissor = state.defaultScissor;
                state.currScissor = defaultScissor;
                state.newScissor = defaultScissor;

                var defaultCullState = state.defaultCullState;
                state.currCullState = defaultCullState;
                state.newCullState = defaultCullState;

                var defaultDepthState = state.defaultDepthState;
                state.currDepthState = defaultDepthState;
                state.newDepthState = defaultDepthState;

                var defaultBlendState = state.defaultBlendState;
                state.currBlendState = defaultBlendState;
                state.newBlendState = defaultBlendState;

                state.currBlendAlphaEq = state.defaultBlendAlphaEq;
                state.currBlendRGBEq = state.defaultBlendRGBEq;
                state.currBlendAlphaSrcFunc = state.defaultBlendAlphaSrcFunc;
                state.currBlendRGBSrcFunc = state.defaultBlendRGBSrcFunc;
                state.currBlendAlphaDestFunc = state.defaultBlendAlphaDestFunc;
                state.currBlendRGBDestFunc = state.defaultBlendRGBDestFunc;

                state.currPrimitiveTopology = glPrimitiveTopology(gl, state.defaultPrimitiveTopology, state);

                state.clearColor = state.defaultClearColor;
                state.clearDepth = state.defaultClearDepth;

                //extensions
                state.floatTextures_EXT = gl.getExtension('OES_texture_float');
                if (state.floatTextures_EXT != null)
                    state.floatTexturesLinearFilter_EXT = gl.getExtension('OES_texture_float_linear') != null;
                else
                    state.floatTexturesLinearFilter_EXT = false;

                state.floatRenderTarget_EXT = gl.getExtension('WEBGL_color_buffer_float');
                state.multipleRenderTargets_EXT = gl.getExtension('WEBGL_draw_buffers');
                if (state.multipleRenderTargets_EXT != null)
                    state.multipleRenderTargetsCount_EXT = gl.getParameter(state.multipleRenderTargets_EXT.MAX_DRAW_BUFFERS_WEBGL);
                else
                    state.multipleRenderTargetsCount_EXT = 0;

                setImplDefault(gl, state);
            };

            function resetState(state) {

                //resource descriptors
                state.buffers = {};
                state.textures = {};
                state.programs = {};
                state.programsVariables = {};
                state.shaders = {};
                state.renderTargets = {};

                //resource bindings
                state.boundBuffers = {};
                state.boundProgram = null;
                state.boundTextures = {};
                state.boundRenderTarget = null;

                //attribute bindings
                state.enabledAttributes = {};
                state.attributeBindings = {};
                state.pendingBindings = [];
                state.attributeBufferMap = {};
                state.newlyEnabledAttributes = {};

                //texture units bindings
                state.textureUnitMap = {};

                //pipeline bindings
                state.currVertexBuffers = [];
                state.currIndexBuffer = null;
                state.currProgram = null;
                state.currRenderTarget = null;
            }

        })();

        /*
         * overrides some default parameters, in particular : 
         * 1 - enables depth test with a 'less than' operator
         * 2 - enables back face culling, where back faces are, by default, the ones with the 
         * clockwise-ordered vertices
         */
        function setImplDefault(gl, state) {
            state.defaultDepthState = States.DepthState.LESS;
            setDepthState(null, state);
            state.defaultCullState = States.CullState.BACK;
            setCullState(null, state);
        }

        //undoes implementation default overrides
        function unsetImplDefault(gl, state) {
            state.defaultDepthState = States.DepthState.NONE;
            setDepthState(null, state);
            state.defaultCullState = States.CullState.NONE;
            setCullState(null, state);
        }

        //WEBGL BINDINGS WITH REDUNDANT STATE CHANGES AVOIDANCE

        //binds a webgl program object
        function bindProgram(gl, program, state) {
            var currBoundProgram = state.boundProgram;

            if (currBoundProgram !== program) {
                gl.useProgram(program);
                state.boundProgram = program;
            }
        }

        //retrieves the current bound webgl program object
        function getBoundProgram(state) {
            return state.boundProgram;
        }

        //changes the current active texture unit
        function setTextureUnit(gl, textureUnit, state) {

            var textureUnitIndex = textureUnit - gl.TEXTURE0;

            if (textureUnitIndex >= state.limits.MAX_COMBINED_TEXTURE_IMAGE_UNITS || textureUnitIndex < 0)
                throw new Error('invalid texture unit');

            var activeTextureUnit = state.activeTextureUnit;

            if (textureUnit !== activeTextureUnit) {
                gl.activeTexture(textureUnit);
                state.activeTextureUnit = textureUnit;
            }
        }

        /*
         * binds a webgl texture object on the specified target of a particular texture unit (if specified, otherwise 
         * the current active texture unit is used).
         * if texture is null, the previous binding is broken.
         */
        function bindTexture(gl, target, texture, state, textureUnit) {

            if (textureUnit != null)
                setTextureUnit(gl, textureUnit, state);

            var activeTextureUnit = state.activeTextureUnit;
            var boundTextures = state.boundTextures;

            //get current bindings for the texture unit
            var textureUnitBinding = boundTextures[activeTextureUnit];
            var targetBinding;

            if (textureUnitBinding == null) {

                //create the descriptor
                textureUnitBinding = {};
                boundTextures[activeTextureUnit] = textureUnitBinding;

                //make and cache the new binding
                gl.bindTexture(target, texture);
                textureUnitBinding[target] = texture;

            } else {

                //get current texture object bound to target in the texture unit
                targetBinding = textureUnitBinding[target];

                //check if the texture is already bound
                if (targetBinding == texture)
                    return;
                else {
                    gl.bindTexture(target, texture);
                    textureUnitBinding[target] = texture;
                }
            }
        }

        /*
         * retrieves the current bound webgl texture object on the specified target of a particular texture unit regardless the current
         * active texture unit. it DOESN'T change the current active texture unit, if the texture unit 
         * is not specified the current active texture unit is used.
         */
        function getBoundTexture(gl, target, state, textureUnit) {
            if (textureUnit == null)
                textureUnit = state.activeTextureUnit;

            var boundTextures = state.boundTextures;
            var textureUnitBinding = boundTextures[textureUnit];
            var boundTexture = null;

            if (textureUnitBinding != null)
                boundTexture = textureUnitBinding[target];

            return boundTexture;
        }

        /*
         * binds a webgl buffer object on the specified target, if null is specified 
         * the previous binding is broken
         */
        function bindBuffer(gl, target, buffer, state) {
            var currBoundBuffer = state.boundBuffers[target];

            if (currBoundBuffer !== buffer) {
                gl.bindBuffer(target, buffer);
                state.boundBuffers[target] = buffer;
            }
        }

        //retrieves the current bound webgl buffer object on the specified target
        function getBoundBuffer(target, state) {
            return state.boundBuffers[target];
        }

        /*
         * binds a webgl rendertarget (framebuffer) object, 
         * if null is specified the default rendertarget is used
         */
        function bindRenderTarget(gl, renderTarget, state) {

            var boundRenderTarget = state.boundRenderTarget;

            if (boundRenderTarget !== renderTarget) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget);
                state.boundRenderTarget = renderTarget;
            }
        }

        //retrieves the current bound webgl rendertarget (framebuffer) object
        function getBoundRenderTarget(gl, state) {
            return state.boundRenderTarget;
        }

        /* retrieves the parameters of a texture object performing the webgl conversions and putting 
        *  them in the params parameter.
        *  here are handled NPOT (non power of two ) textures : according to the specs a NPOT texture can't use mipmaps
        *  and the only wrap mode allowed is CLAMP_TO_EDGE
        */
        function getTextureParameters(gl, texture, params, state) {

            var magnification = glFilter(gl, texture.magnification, state);
            var minification = texture.minification;
            var wrapS;
            var wrapT;

            //apply restriction for NPOT textures
            if (texture.powerOfTwo) {
                wrapS = glWrapMode(gl, texture.wrapS, state);
                wrapT = glWrapMode(gl, texture.wrapT, state);
                minification = glFilter(gl, minification, state);
            } else {
                wrapS = gl.CLAMP_TO_EDGE;
                wrapT = gl.CLAMP_TO_EDGE;
                minification = selectNonMipMappedFilter(gl, minification);
            }

            params.magnification = magnification;
            params.minification = minification;
            params.wrapS = wrapS;
            params.wrapT = wrapT;

            return params;
        }

        //WEBGL UTILS

        //retrieves the WebGLRenderingContext for a canvas
        function getContext(canvas) {
            var params = { premultipliedAlpha: false };
            var gl = canvas.getContext('webgl', params);
            if (!gl) {
                gl = canvas.getContext('experimental-webgl', params);
                if (!gl)
                    throw new Error('WebGL is not supported!');
            }
            return gl;
        }

        /*
        * sets the parameters (if necessary) of a webgl texture object bound on the specified target of the current active texture unit.
        * the parameters oldParameters are treated as the current parameters, a null value is interpreted as the corresponding default value.        
        */
        function setTextureParameters(gl, target, params, oldParameters, state) {

            var magnification = params.magnification;
            var minification = params.minification;
            var wrapS = params.wrapS;
            var wrapT = params.wrapT;

            if (oldParameters != null) {
                var oldMagnification = oldParameters.magnification;
                var oldMinification = oldParameters.minification;
                var oldWrapS = oldParameters.wrapS;
                var oldWrapT = oldParameters.wrapT;
            } else {
                oldMagnification = state.defaultMagnification;
                oldMinification = state.defaultMinification;
                oldWrapS = state.defaultWrapS;
                oldWrapT = state.defaultWrapT;
            }

            //set filters and wrap mode
            if (magnification !== oldMagnification)
                gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnification);
            if (minification !== oldMinification)
                gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minification);
            if (wrapS !== oldWrapS)
                gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
            if (wrapT !== oldWrapT)
                gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
        }

        // sets the data and storage parameters of a webgl texture object bound on the specified target of the current active texture unit.        
        function texImage2D(gl, target, img, width, height, level, imageFormat, imageDataType) {

            if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || img instanceof ImageData)
                gl.texImage2D(target, level, imageFormat, imageFormat, imageDataType, img);
            else
                //img can be null ( e.g. texture used as render target )
                gl.texImage2D(target, level, imageFormat, width, height, 0, imageFormat, imageDataType, img);
        }

        // sets the mipmap hierarchy of a webgl texture object bound on the specified target of the current active texture unit.
        function handleMipMapping(gl, target, width, height, imageFormat, imageDataType, mipMaps) {
            for (var i = 0, count = mipMaps.length ; i < count; i++)
                texImage2D(gl, target, mipMaps[i], width, height, i + 1, imageFormat, imageDataType);
        }

        function getSizeByGlType(gl, type) {
            switch (type) {
                case gl.BYTE:
                    return Int8Array.BYTES_PER_ELEMENT;
                case gl.SHORT:
                    return Int16Array.BYTES_PER_ELEMENT;
                case gl.UNSIGNED_BYTE:
                    return Uint8Array.BYTES_PER_ELEMENT;
                case gl.UNSIGNED_SHORT:
                    return Uint16Array.BYTES_PER_ELEMENT;
                case gl.FLOAT:
                    return Float32Array.BYTES_PER_ELEMENT;
                default:
                    throw new Error('invalid type');
            }
        }

        /* given a texture filter, selects the best compatible texture filter which 
        *  can be used with a non-mipmapped texture
        */
        function selectNonMipMappedFilter(gl, mipmappedFilter) {
            switch (mipmappedFilter) {
                case Textures.TextureFilter.LINEAR:
                case Textures.TextureFilter.LINEAR_MIPMAP_NEAREST:
                case Textures.TextureFilter.LINEAR_MIPMAP_LINEAR:
                    return gl.LINEAR;
                case Textures.TextureFilter.NEAREST:
                case Textures.TextureFilter.NEAREST_MIPMAP_NEAREST:
                case Textures.TextureFilter.NEAREST_MIPMAP_LINEAR:
                    return gl.NEAREST;
                default:
                    throw new Error('invalid texture filter');
            }
        }

        //ENUM CONVERSION FUNCTIONS

        function glPrimitiveTopology(gl, primitiveTopology, state) {
            switch (primitiveTopology) {
                case PrimitiveTopology.POINTS:
                    return gl.POINTS;
                case PrimitiveTopology.TRIANGLES:
                    return gl.TRIANGLES;
                case PrimitiveTopology.LINES:
                    return gl.LINES;
                case PrimitiveTopology.LINE_STRIP:
                    return gl.LINE_STRIP;
                case PrimitiveTopology.LINE_LOOP:
                    return gl.LINE_LOOP;
                case PrimitiveTopology.TRIANGLE_STRIP:
                    return gl.TRIANGLE_STRIP;
                case PrimitiveTopology.TRIANGLE_FAN:
                    return gl.TRIANGLE_FAN;
                default:
                    throw new Error('invalid primitive topology');
            }
        }

        function glFilter(gl, filter, state) {
            switch (filter) {
                case Textures.TextureFilter.LINEAR:
                    return gl.LINEAR;
                case Textures.TextureFilter.NEAREST:
                    return gl.NEAREST;
                case Textures.TextureFilter.NEAREST_MIPMAP_NEAREST:
                    return gl.NEAREST_MIPMAP_NEAREST;
                case Textures.TextureFilter.NEAREST_MIPMAP_LINEAR:
                    return gl.NEAREST_MIPMAP_LINEAR;
                case Textures.TextureFilter.LINEAR_MIPMAP_NEAREST:
                    return gl.LINEAR_MIPMAP_NEAREST;
                case Textures.TextureFilter.LINEAR_MIPMAP_LINEAR:
                    return gl.LINEAR_MIPMAP_LINEAR;
                default:
                    throw new Error('invalid texture filter');
            }
        }

        function glWrapMode(gl, wrapMode, state) {
            switch (wrapMode) {
                case Textures.TextureWrapMode.REPEAT:
                    return gl.REPEAT;
                case Textures.TextureWrapMode.MIRRORED_REPEAT:
                    return gl.MIRRORED_REPEAT;
                case Textures.TextureWrapMode.CLAMP_TO_EDGE:
                    return gl.CLAMP_TO_EDGE;
                default:
                    throw new Error('invalid wrap mode');
            }
        }

        function glImageFormat(gl, imageFormat, state) {
            switch (imageFormat) {                
                case Textures.ImageFormat.RGB:
                    return gl.RGB;
                case Textures.ImageFormat.RGBA:
                    return gl.RGBA;
                default:
                    throw new Error('invalid image format');
            }
        }

        function glImageDataType(gl, imageDataType, state) {
            switch (imageDataType) {
                case Textures.ImageDataType.UNSIGNED_BYTE:
                    return gl.UNSIGNED_BYTE;
                case Textures.ImageDataType.FLOAT:
                    return gl.FLOAT;
                default:
                    throw new Error('invalid image data type');
            }
        }

        function glDepthDataType(gl, depthDataType, state) {
            switch (depthDataType) {
                case Textures.DepthDataType.SHORT:
                    return gl.DEPTH_COMPONENT16;
                case Textures.DepthDataType.FLOAT:
                    if (state.floatRenderTarget_EXT != null)
                        return state.floatRenderTarget_EXT.RGBA32F_EXT;
                    throw new Error('invalid depth data type');
                default:
                    throw new Error('invalid depth data type');
            }
        }

        function glCubeFace(gl, cubeFace, state) {
            switch (cubeFace) {
                case Textures.CubeMapFace.POSITIVE_X:
                    return gl.TEXTURE_CUBE_MAP_POSITIVE_X;
                case Textures.CubeMapFace.NEGATIVE_X:
                    return gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
                case Textures.CubeMapFace.POSITIVE_Y:
                    return gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
                case Textures.CubeMapFace.NEGATIVE_Y:
                    return gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
                case Textures.CubeMapFace.POSITIVE_Z:
                    return gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
                case Textures.CubeMapFace.NEGATIVE_Z:
                    return gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
                default:
                    throw new Error('invalid cube face');
            }
        }

        function glType(gl, type) {
            switch (type) {
                case DataType.BYTE:
                    return gl.BYTE;
                case DataType.SHORT:
                    return gl.SHORT;
                case DataType.UNSIGNED_BYTE:
                    return gl.UNSIGNED_BYTE;
                case DataType.UNSIGNED_SHORT:
                    return gl.UNSIGNED_SHORT;
                case DataType.FLOAT:
                    return gl.FLOAT;
                default:
                    throw new Error('invalid type');
            }
        }

        function glUsage(gl, usage) {
            switch (usage) {
                case Buffers.Usage.STATIC:
                    return gl.STATIC_DRAW;
                case Buffers.Usage.DYNAMIC:
                    return gl.DYNAMIC_DRAW;
                default:
                    throw new Error('invalid usage');
            }
        }

        function glDepthState(gl, depthState) {
            switch (depthState) {
                case States.DepthState.ALWAYS:
                    return gl.ALWAYS;
                case States.DepthState.EQUAL:
                    return gl.EQUAL;
                case States.DepthState.GREATER:
                    return gl.GREATER;
                case States.DepthState.GREATER_EQUAL:
                    return gl.GEQUAL;
                case States.DepthState.LESS:
                    return gl.LESS;
                case States.DepthState.LESS_EQUAL:
                    return gl.LEQUAL;
                case States.DepthState.NEVER:
                    return gl.NEVER;
                case States.DepthState.NOT_EQUAL:
                    return gl.NOTEQUAL;
                default:
                    throw new Error('invalid depth state');
            }
        }

        function glCullState(gl, cullState) {
            switch (cullState) {
                case States.CullState.BACK:
                    return gl.BACK;
                case States.CullState.FRONT:
                    return gl.FRONT;
                case States.CullState.FRONT_BACK:
                    return gl.FRONT_AND_BACK;
                default:
                    throw new Error('invalid cull state');
            }
        }
        
        //RESOURCE DESCRIPTORS

        function Desc(obj, releasedListener) {
            //the object the descriptor refers to
            this.obj = obj;            
            this.releasedListener = releasedListener;
            this.release = function () {
                obj.removeEventListener('released', releasedListener);
            };
        }

        //shader object descriptor
        function ShaderDesc(obj, releasedListener, glShader, glShaderType) {
            Desc.call(this, obj, releasedListener);

            //the webgl shader object
            this.glShader = glShader;
            //the webgl shader type
            this.glShaderType = glShaderType;
        }

        //program object descriptor
        function ProgramDesc(obj, releasedListener, glProgram, attributes, uniforms, samplerUniforms, parsedUniforms) {
            Desc.call(this, obj, releasedListener);

            //the webgl program object
            this.glProgram = glProgram;
            //the active attributes
            this.attributes = attributes;
            //the active uniforms
            this.uniforms = uniforms;
            //the active uniforms which type is sampler2D or samplerCube 
            this.samplerUniforms = samplerUniforms;
            //uniforms which values are changed
            this.dirtyUniforms = [];
            //uniforms grouped by simple, array and struct in order to make easier building ProgramVariable instances
            this.parsedUniforms = parsedUniforms;
        }

        //buffer object descriptor
        function BufferDesc(obj, releasedListener, glBuffer, target, glUsage) {
            Desc.call(this, obj, releasedListener);

            //the webgl buffer object
            this.glBuffer = glBuffer;
            //the webgl buffer usage
            this.glUsage = glUsage;
            //the webgl target the buffer gets bound
            this.target = target;            
            //the webgl type of a single index, only for index buffers
            this.glIndexType = 0;
            //the size in bytes of a single index, only for index buffers
            this.indexSize = 0;

            this.needsUpdate = false;
            this.dataChanged = false;

            var _this = this;
            this.dataChangedListener = function () {
                _this.needsUpdate = true;
                _this.dataChanged = true;
            };

            this.release = (function () {
                var descRelease = _this.release;
                return function () {
                    obj.removeEventListener('dataChanged', _this.dataChangedListener);
                    descRelease.call(_this);
                };
            })();
        }

        //texture object descriptor
        function TextureDesc(obj, releasedListener, target, glTexture, params) {
            Desc.call(this, obj, releasedListener);

            //the webgl texture object
            this.glTexture = glTexture;
            //the webgl target the texture gets bound
            this.target = target;
            //the webgl texture parameters
            this.params = params;
            //the texture unit the texture is bound
            this.textureUnit = null;

            this.needsUpdate = false;
            this.dataChanged = false;
            this.sizeChanged = false;
            this.paramsChanged = false;
            var _this = this;
            this.dataChangedListener = function () {
                _this.dataChanged = true;
                _this.needsUpdate = true;
            };
            this.paramsChangedListener = function () {
                _this.paramsChanged = true;
                _this.needsUpdate = true;
            };
            this.sizeChangedListener = function () {
                _this.sizeChanged = true;
                _this.needsUpdate = true;
            };
            this.release = (function () {
                var descRelease = _this.release;
                return function () {
                    obj.removeEventListener('dataChanged', _this.dataChangedListener);
                    obj.removeEventListener('sizeChanged', _this.sizeChangedListener);
                    obj.removeEventListener('parametersChanged', _this.paramsChangedListener);
                    descRelease.call(_this);
                };
            })();
        }

        //render target object descriptor
        function RenderTargetDesc(obj, releasedListener, glRenderTarget, colorTextureCount, glDepthBuffer, glDepthBufferDataType) {
            Desc.call(this, obj, releasedListener);
            //the webgl framebuffer object
            this.glRenderTarget = glRenderTarget;
            this.colorTextureCount = colorTextureCount;
            //the webgl renderbuffer object
            this.glDepthBuffer = glDepthBuffer;
            this.glDepthBufferDataType = glDepthBufferDataType;


            this.needsUpdate = false;
            var _this = this;
            this.sizeChangedListener = function () {
                _this.needsUpdate = true;
            };
            this.release = (function () {
                var descRelease = _this.release;
                return function () {
                    var colorTexture = obj.colorTexture;
                    if(colorTexture instanceof Array)
                        for (var i = 0; i < colorTextureCount; i++)
                            colorTexture[i].removeEventListener('sizeChanged', _this.sizeChangedListener);
                    else
                        colorTexture.removeEventListener('sizeChanged', _this.sizeChangedListener);

                    descRelease.call(_this);
                };
            })();
        }

        //descriptors pools
        var shaderDescPool = Pools.createObjectPool(ShaderDesc);
        Object.defineProperty(shaderDescPool, 'cleanObject', { value: Utils.nullifyObjectKeys });

        var programDescPool = Pools.createObjectPool(ProgramDesc);
        Object.defineProperty(programDescPool, 'cleanObject', { value: Utils.nullifyObjectKeys });

        var bufferDescPool = Pools.createObjectPool(BufferDesc);
        Object.defineProperty(bufferDescPool, 'cleanObject', { value: Utils.nullifyObjectKeys });

        var textureDescPool = Pools.createObjectPool(TextureDesc);
        Object.defineProperty(textureDescPool, 'cleanObject', { value: Utils.nullifyObjectKeys });

        var renderTargetDescPool = Pools.createObjectPool(RenderTargetDesc);
        Object.defineProperty(renderTargetDescPool, 'cleanObject', { value: Utils.nullifyObjectKeys });

        //RESOURCE INITIALIZATION AND DELETION

        //initializes a shader object and creates a descriptor for its use
        var initShader = (function () {

            return function (gl, shader, state) {

                var shaders = state.shaders;

                var shaderID = shader.ID;
                var shaderDesc = shaders[shaderID];

                if (shaderDesc != null)
                    return;

                var glShaderType = gl.FRAGMENT_SHADER;
                var isVertexShader = false;
                if (shader.type === Shaders.ShaderType.VERTEX_SHADER) {
                    glShaderType = gl.VERTEX_SHADER;
                    isVertexShader = true;
                }

                var glShader = compile(gl, shader.source, glShaderType);

                //check if compilation succeded
                var succeded = gl.getShaderParameter(glShader, gl.COMPILE_STATUS);

                //if the context is lost, the compilation may not have failed        
                if (!succeded && !gl.isContextLost()) {
                    //get info and deallocate shader
                    var compilationLog = gl.getShaderInfoLog(glShader);
                    //var lines = shader.source.split(/\r\n|\r|\n/);                
                    gl.deleteShader(glShader);
                    throw new Error('unable to initialize Shader...compilation failed : ' + compilationLog);
                }
                
                function releasedListener () {
                    deleteShader(gl, shader, state);
                }

                shader.addEventListener('released', releasedListener);
                shaderDesc = shaderDescPool.get(shader, releasedListener, glShader, glShaderType);
                shaders[shaderID] = shaderDesc;
            };

            //perform shader compilation
            function compile(gl, shaderSrc, glShaderType) {

                var shaderObject = gl.createShader(glShaderType);

                gl.shaderSource(shaderObject, shaderSrc);
                gl.compileShader(shaderObject);

                return shaderObject;
            }

            //deletes a shader objects releasing its descriptor
            function deleteShader(gl, shader, state) {
                var shaders = state.shaders;

                var shaderID = shader.ID;
                var shaderDesc = shaders[shaderID];

                if (shaderDesc == null) 
                    return;

                shaderDesc.release();
                var glShader = shaderDesc.glShader;
                gl.deleteShader(shaderDesc.glShader);
                shaders[shaderID] = null;
                shaderDescPool.release(shaderDesc);                
            }

        })();
        
        //initializes a program object and creates a descriptor for its use
        var initProgram = (function () {

            /*
            * provides a reference to a wrapper of a webgl uniform** function, 
            * this avoids branching on its type every time a uniform has to be set
            */
            var getStoreUniformFun = (function () {

                return function (gl, type, size) {

                    switch (type) {
                        case gl.BOOL:
                        case gl.INT:
                        case gl.SAMPLER_2D:
                        case gl.SAMPLER_CUBE:
                            if (size > 1)
                                return uniform1iv;
                            else
                                return uniform1i;
                        case gl.FLOAT:
                            if (size > 1)
                                return uniform1fv;
                            else
                                return uniform1f;
                        case gl.FLOAT_VEC2:
                            return uniform2fv;
                        case gl.FLOAT_VEC3:
                            return uniform3fv;
                        case gl.FLOAT_VEC4:
                            return uniform4fv;
                        case gl.BOOL_VEC2:
                        case gl.INT_VEC2:
                            return uniform2iv;
                        case gl.BOOL_VEC3:
                        case gl.INT_VEC3:
                            return uniform3iv;
                        case gl.BOOL_VEC4:
                        case gl.INT_VEC4:
                            return uniform4iv;
                        case gl.FLOAT_MAT2:
                            return uniformMatrix2fv;
                        case gl.FLOAT_MAT3:
                            return uniformMatrix3fv;
                        case gl.FLOAT_MAT4:
                            return uniformMatrix4fv;
                        default:
                            throw new Error('invalid uniform type');
                    }
                };

                function uniform1i(gl, location, value) {
                    gl.uniform1i(location, value);
                }

                function uniform1iv(gl, location, value) {
                    gl.uniform1iv(location, value);
                }

                function uniform2iv(gl, location, value) {
                    gl.uniform2iv(location, value);
                }

                function uniform3iv(gl, location, value) {
                    gl.uniform3iv(location, value);
                }

                function uniform4iv(gl, location, value) {
                    gl.uniform4iv(location, value);
                }

                function uniform1f(gl, location, value) {
                    gl.uniform1f(location, value);
                }

                function uniform1fv(gl, location, value) {
                    gl.uniform1fv(location, value);
                }

                function uniform2fv(gl, location, value) {
                    gl.uniform2fv(location, value);
                }

                function uniform3fv(gl, location, value) {
                    gl.uniform3fv(location, value);
                }

                function uniform4fv(gl, location, value) {
                    gl.uniform4fv(location, value);
                }

                function uniformMatrix2fv(gl, location, value) {
                    gl.uniformMatrix2fv(location, false, value);
                }

                function uniformMatrix3fv(gl, location, value) {
                    gl.uniformMatrix3fv(location, false, value);
                }

                function uniformMatrix4fv(gl, location, value) {
                    gl.uniformMatrix4fv(location, false, value);
                }


            })();

            return function (gl, program, state) {

                var programs = state.programs;

                var programID = program.ID;
                var programDesc = programs[programID];

                if (programDesc != null)
                    return;

                //get vertex and fragment shader
                var vShader = program.vertexShader;
                var fShader = program.fragmentShader;

                //initialize shaders
                initShader(gl, vShader, state);
                initShader(gl, fShader, state);

                var shaders = state.shaders;
                var glVshader = shaders[vShader.ID].glShader;
                var glFshader = shaders[fShader.ID].glShader;

                //create the program and link it
                var glProgram = gl.createProgram();

                gl.attachShader(glProgram, glVshader);
                gl.attachShader(glProgram, glFshader);
                gl.linkProgram(glProgram);
                gl.validateProgram(glProgram);

                //check if linking failed...same as shader compilation check for context lost
                var succeded = gl.getProgramParameter(glProgram, gl.LINK_STATUS);

                if (!succeded && !gl.isContextLost()) {
                    var linkageLog = gl.getProgramInfoLog(glProgram);
                    gl.deleteProgram(glProgram);
                    throw new Error('unable to initialize Program...linking failed : ' + linkageLog);
                }

                //find active attributes infos
                var activeAttribCount = gl.getProgramParameter(glProgram, gl.ACTIVE_ATTRIBUTES);
                var attributes = new Array(activeAttribCount);
                var attribute;
                var i;
                var info;
                var elementSize;
                var elementsCount;

                for (i = 0; i < activeAttribCount; i++) {

                    info = gl.getActiveAttrib(glProgram, i);
                    attribute = info.name;
                    info.location = gl.getAttribLocation(glProgram, attribute);

                    switch (info.type) {
                        case gl.FLOAT:
                            elementSize = 1;
                            elementsCount = 1;
                            break;
                        case gl.FLOAT_VEC2:
                            elementSize = 2;
                            elementsCount = 1;
                            break;
                        case gl.FLOAT_VEC3:
                            elementSize = 3;
                            elementsCount = 1;
                            break;
                        case gl.FLOAT_VEC4:
                            elementSize = 4;
                            elementsCount = 1;
                            break;
                        case gl.FLOAT_MAT2:
                            elementSize = 2;
                            elementsCount = 2;
                            break;
                        case gl.FLOAT_MAT3:
                            elementSize = 3;
                            elementsCount = 3;
                            break;
                        case gl.FLOAT_MAT4:
                            elementSize = 4;
                            elementsCount = 4;
                            break;
                    }

                    info.elementSize = elementSize;
                    info.elementsCount = elementsCount;
                    attributes[i] = info;
                }

                //find active uniforms infos
                var activeUniformsCount = gl.getProgramParameter(glProgram, gl.ACTIVE_UNIFORMS);
                var uniforms = {};
                var parsedUniforms = {};
                var samplerUniforms = [];

                for (i = 0; i < activeUniformsCount; i++) {

                    info = gl.getActiveUniform(glProgram, i);
                    var uniform = info.name;
                    var nameLen = uniform.length;
                    var hasSubscript = uniform.charAt(nameLen - 1) === ']';
                    var size = info.size;
                    var type = info.type;
                    var location = gl.getUniformLocation(glProgram, uniform);
                    var isSampler = type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE;

                    var uniformDesc = parseUniform(uniform, parsedUniforms);

                    if (hasSubscript) {

                        uniform = uniform.substr(0, nameLen - 3);
                        var elements = uniformDesc.elements;

                        var unSubscriptedName = uniform + '[';
                        var perElementStoreFun = getStoreUniformFun(gl, type, 1);

                        //already have the location of the first element
                        var elementName = unSubscriptedName + 0 + ']';
                        info = createUniformInfo(type, 1);                        
                        info.name = elementName;
                        info.storeElementFun = perElementStoreFun;
                        info.location = location;

                        uniforms[elementName] = info;
                        elements.push(info);

                        for (var j = 1; j < size; j++) {
                            elementName = unSubscriptedName + j + ']';
                            info = createUniformInfo(type, 1);
                            info.name = elementName;
                            info.location = gl.getUniformLocation(glProgram, elementName);
                            info.storeElementFun = perElementStoreFun;
                            uniforms[elementName] = info;
                            elements.push(info);
                        }

                        if (isSampler)
                            for (j = 0 ; j < size; j++)
                                samplerUniforms.push(elements[j]);
                    }

                    info = createUniformInfo(type, size, uniformDesc);
                    info.location = location;
                    info.storeElementFun = getStoreUniformFun(gl, type, size);
                    info.name = uniform;
                    info.hasSubscript = hasSubscript;
                    uniforms[uniform] = info;
                    if (isSampler)
                        samplerUniforms.push(info);
                }

                function releasedListener () {
                    deleteProgram(gl, program, state);
                }

                program.addEventListener('released', releasedListener);
                programDesc = programDescPool.get(program, releasedListener, glProgram, attributes, uniforms, samplerUniforms, parsedUniforms);
                programs[programID] = programDesc;
            };
            
            function createUniformInfo(type, size, info) {
                if (info == null)
                    info = {};
                info.type = type;
                info.size = size;
                info.hasSubscript = false;
                info.value = null;
                info.newValue = null;
                return info;
            }

            //uniform is an active uniform, so is syntactically correct
            function parseUniform(uniform, uniforms, globalName) {

                if (globalName == null)
                    globalName = '';

                var i = 0;
                var length = uniform.length;
                var currName = '';
                var c;
                var uniformDesc;

                while (i < length) {

                    c = uniform.charAt(i);

                    switch (c) {

                        case '[':

                            //uniform is an array
                            var j = i + 1;
                            var digit;
                            var index = '';// uniform.charAt(i + 1);
                            while ((digit = uniform.charAt(j)) !== ']') {
                                index += digit;
                                j++;
                            }

                            uniformDesc = uniforms[currName];

                            if (uniformDesc == null) {

                                uniformDesc = {
                                    elements: []
                                };

                                uniforms[currName] = uniformDesc;
                            }

                            var elements = uniformDesc.elements;
                                                        
                            if (j + 1 < length && uniform.charAt(j + 1) === '.') {

                                //the elements are structs

                                var element = elements[index];
                                var elementName = globalName + currName + '[' + index + ']';
                                if (element == null) {

                                    element = {
                                        fields: {}
                                    };
                                    elements[index] = element;
                                }
                                                                
                                return parseUniform(uniform.substr(j + 2), element.fields, elementName + '.');

                            }

                            c = ']';                            
                            i = j;

                            break;

                        case '.':

                            uniformDesc = uniforms[currName];

                            if (uniformDesc == null) {
                                uniformDesc = {
                                    fields: {}
                                };
                                uniforms[currName] = uniformDesc;
                            }

                            if (uniformDesc.fields == null)
                                uniformDesc.fields = {};

                            return parseUniform(uniform.substr(i + 1), uniformDesc.fields, globalName + currName + '.');

                        default:
                            currName += c;
                    }

                    i++;
                }

                if (c !== ']')
                    uniformDesc = (uniforms[currName] = {});

                return uniformDesc;
            }

            function deleteProgram(gl, program, state) {

                var programs = state.programs;

                var programID = program.ID;
                var programDesc = programs[programID];

                if (programDesc == null)
                    return;

                programDesc.release();
                
                var glProgram = programDesc.glProgram;

                //break bindings if necessary, delete webgl object
                if (state.currProgram == program)
                    state.currProgram = null;
                var boundProgram = getBoundProgram(state);
                if (boundProgram == glProgram)
                    bindProgram(gl, null, state);

                gl.deleteProgram(glProgram);

                //remove variables listeners            
                var variablesDesc = state.programsVariables[programID];
                if (variablesDesc != null) {
                    var variables = variablesDesc.variables;
                    var listeners = variablesDesc.listeners;
                    for (var key in variables)
                        deleteProgramVariable(variables[key], listeners);
                }

                programs[programID] = null;
                programDescPool.release(programDesc);
            }

        })();

        //initializes a texture object and creates a descriptor for its use
        var initTexture = (function () {

            var initTextureGeneric = (function () {

                return function (gl, texture, target, maxWidth, maxHeight, state) {

                    var textures = state.textures;
                    var textureID = texture.ID;
                    var textureDesc = textures[textureID];

                    if (textureDesc != null)
                        return;

                    var width = texture.width;
                    var height = texture.height;

                    //check if the size is allowed
                    if (width > maxWidth || height > maxHeight)
                        throw new Error('invalid texture size');

                    //check float availability/requirements
                    if (texture.imageDataType == Textures.ImageDataType.FLOAT) {

                        if (state.floatTextures_EXT == null)
                            throw new Error('float textures not supported');
                                       
                        var textureMinification = texture.minification;
                        var textureFilters = Textures.TextureFilter;
                        var linearFilter = textureFilters.LINEAR;
                        var useLinearFilter = texture.magnification == linearFilter || 
                            textureMinification == linearFilter || textureMinification == textureFilters.LINEAR_MIPMAP_LINEAR
                            || textureMinification == textureFilters.NEAREST_MIPMAP_LINEAR;
                        
                        if(useLinearFilter && !state.floatTexturesLinearFilter_EXT)
                            throw new Error('linear texture filter not supported for float textures');                        
                    }

                    //create and temporary bind a new webgl texture object
                    var glTexture = gl.createTexture();

                    var currTextureBound = getBoundTexture(gl, target, state);
                    bindTexture(gl, target, glTexture, state);

                    //initialize texture parameters and data
                    var params = {};
                    getTextureParameters(gl, texture, params, state);
                    setTextureParameters(gl, target, params, null, state);

                    setTextureData(gl, texture, state);

                    //restore previous texture binding
                    bindTexture(gl, target, currTextureBound, state);

                    //attach change listeners and initialize descriptor
                    function releasedListener() {
                        deleteTexture(gl, texture, state);
                    }

                    texture.addEventListener('released', releasedListener);
                    textureDesc = textureDescPool.get(texture, releasedListener, target, glTexture, params);
                    texture.addEventListener('dataChanged', textureDesc.dataChangedListener);
                    texture.addEventListener('sizeChanged', textureDesc.sizeChangedListener);
                    texture.addEventListener('parametersChanged', textureDesc.paramsChangedListener);
                    textures[textureID] = textureDesc;
                };

                function deleteTexture(gl, texture, state) {
                    var textures = state.textures;
                    var textureID = texture.ID;

                    var textureDesc = textures[textureID];

                    if (textureDesc == null)
                        return;

                    textureDesc.release();
                    
                    //break webgl texture object current bindings and delete it
                    var textureUnit = textureDesc.textureUnit;
                    if (textureUnit != null)
                        bindTexture(gl, textureDesc.target, null, state, textureUnit);

                    gl.deleteTexture(textureDesc.glTexture);

                    //release descriptor
                    textures[textureID] = null;
                    textureDescPool.release(textureDesc);
                }
            })();

            return function (gl, texture, state) {
                var limit;
                //distinguish between texture and texture cube
                if (texture.type == Textures.TextureType.Texture) {
                    limit = state.limits.MAX_TEXTURE_SIZE;
                    initTextureGeneric(gl, texture, gl.TEXTURE_2D, limit, limit, state);
                } else {
                    limit = state.limits.MAX_CUBE_MAP_TEXTURE_SIZE;
                    initTextureGeneric(gl, texture, gl.TEXTURE_CUBE_MAP, limit, limit, state);
                }
            };

        })();

        // updates texture parameters and storage if necessary
        function updateTextureFromDesc(gl, textureDesc, needsBind, state) {

            if (!textureDesc.needsUpdate)
                return;

            var texture = textureDesc.obj;
            var updateData = false;
            var updateParams = false;

            if (textureDesc.sizeChanged) {
                updateData = true;
                //enable NPOT restrictions check
                updateParams = true;
            } else {

                if (textureDesc.dataChanged) 
                    updateData = true;

                if (textureDesc.paramsChanged)
                    updateParams = true;                
            }

            //bind temporary the webgl texture object if necessary and perform the updates
            var target = textureDesc.target;
            if (needsBind) {
                var textureUnit = textureDesc.textureUnit;
                var boundTexture = getBoundTexture(gl, target, state, textureUnit);
                bindTexture(gl, target, textureDesc.glTexture, state, textureUnit);
            }

            if (updateParams) {
                var params = textureDesc.params;
                var newParams = Pools.ObjectPool.get();
                getTextureParameters(gl, texture, newParams, state);
                setTextureParameters(gl, target, newParams, params, state);
                params.magnification = newParams.magnification;
                params.minification = newParams.minification;
                params.wrapS = newParams.wrapS;
                params.wrapT = newParams.wrapT;
                Pools.ObjectPool.release(newParams);
                textureDesc.paramsChanged = false;
            }
            if (updateData) {
                setTextureData(gl, texture, state);
                textureDesc.sizeChanged = false;
                textureDesc.dataChanged = false;
            }

            if (needsBind)
                bindTexture(gl, target, boundTexture, state, textureUnit);
            textureDesc.needsUpdate = false;
        }

        function generateRendertargetMipMaps(gl, rendertarget, state) {
            var colorTexture = rendertarget.colorTexture;
            if (!colorTexture.powerOfTwo)
                return;

            var textureDesc = getDesc(gl, colorTexture, initTexture, state.textures, state);
            var target = textureDesc.target;

            var boundTexture = getBoundTexture(gl, target, state);
            bindTexture(gl, target, textureDesc.glTexture, state);
            gl.generateMipmap(target);
            bindTexture(gl, target, boundTexture, state);
        }
                
        // sets data and mipmap hierarchy (if provided and texture is not a NPOT texture) of a texture object
        function setTextureData(gl, texture, state) {

            var imageFormat = glImageFormat(gl, texture.imageFormat, state);
            var imageDataType = glImageDataType(gl, texture.imageDataType, state);
            var data = texture.imageData;
            var width = texture.width;
            var height = texture.height;
            var mipmap = texture.mipmap;
            var flipY = texture.flipY;

            //check if Y-axis needs to be flipped            
            if (state.flippedY !== flipY) {
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
                state.flippedY = flipY;
            }
            
            //branch by texture type
            if (texture.type == Textures.TextureType.Texture) {

                texImage2D(gl, gl.TEXTURE_2D, data, width, height, 0, imageFormat, imageDataType);
                
                if (texture.powerOfTwo && texture.useMipMap) {
                    if (mipmap != null)
                        handleMipMapping(gl, gl.TEXTURE_2D, width, height, imageFormat, imageDataType, mipmap);
                    else if (data != null)
                        gl.generateMipmap(gl.TEXTURE_2D);
                }

            } else {

                var cubeMapFaces = state.cubeMapFaces;
                var i;
                if (data == null)
                    for (i = 0; i < 6; i++)
                        texImage2D(gl, cubeMapFaces[i], null, width, height, 0, imageFormat, imageDataType);
                else 
                    for (i = 0; i < 6; i++)
                        texImage2D(gl, cubeMapFaces[i], data[i], width, height, 0, imageFormat, imageDataType);

                if (texture.powerOfTwo && texture.useMipMap) {
                    if (mipmap != null)
                        for (i = 0; i < 6; i++)
                            handleMipMapping(gl, cubeMapFaces[i], width, height, imageFormat, imageDataType, mipmap[i]);
                    else if (data != null)
                        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                }                
            }
        }

        //initializes a render target object and creates a descriptor for its use
        var initRenderTarget = (function () {

            return function(gl, renderTarget, state) {

                var renderTargets = state.renderTargets;

                var renderTargetID = renderTarget.ID;
                var renderTargetDesc = renderTargets[renderTargetID];

                if (renderTargetDesc != null)
                    return;

                //get color texture
                var colorTexture = renderTarget.colorTexture;
                var colorTextureCount;
                var width;
                var height;
                var colorTextureDataType;
                
                var attachmentsProperties;
                var multipleRenderTargets_EXT = null;

                //check for MRT
                if (colorTexture instanceof Array) {

                    colorTextureCount = colorTexture.length;                    

                    multipleRenderTargets_EXT = state.multipleRenderTargets_EXT;

                    if (multipleRenderTargets_EXT == null)
                        throw new Error('MRT not supported');
                    
                    if (state.multipleRenderTargetsCount_EXT < colorTextureCount)
                        throw new Error('MRT count not supported');
                    
                    width = colorTexture[0].width;
                    height = colorTexture[0].height;
                    colorTextureDataType = colorTexture[0].imageDataType;

                    attachmentsProperties = [multipleRenderTargets_EXT.COLOR_ATTACHMENT0_WEBGL];

                    for (var i = 1; i < colorTextureCount; i++) {
                        var colorText = colorTexture[i];
                        if (colorText.width !== width || colorText.height !== height || colorText.imageDataType !== colorTextureDataType)
                            throw new Error('MRT must be the same size and data type');
                        attachmentsProperties.push(multipleRenderTargets_EXT['COLOR_ATTACHMENT' + i + '_WEBGL']);
                    }                    

                } else {
                    colorTextureCount = 1;
                    width = colorTexture.width;
                    height = colorTexture.height;
                    colorTextureDataType = colorTexture.imageDataType;
                    colorTexture = [colorTexture];
                    attachmentsProperties = [gl.COLOR_ATTACHMENT0];
                }
                
                //check if the size is allowed
                if (width > state.limits.MAX_RENDERBUFFER_SIZE || height > state.limits.MAX_RENDERBUFFER_SIZE)
                    throw new Error('invalid render target size');

                //if (colorTextureDataType == Textures.ImageDataType.FLOAT && !state.floatRenderTarget_EXT)
                //    throw new Error('float render target not supported');

                //create depth buffer        
                var glDepthBufferDataType = glDepthDataType(gl, renderTarget.depthDataType, state);
                var glDepthBuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, glDepthBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, glDepthBufferDataType, width, height);

                //create render target
                var glRenderTarget = gl.createFramebuffer();
                var currBoundRenderTarget = getBoundRenderTarget(gl, state);
                bindRenderTarget(gl, glRenderTarget, state);

                if (multipleRenderTargets_EXT != null)
                    multipleRenderTargets_EXT.drawBuffersWEBGL(attachmentsProperties);

                //attach depth buffer
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, glDepthBuffer);

                for (var i = 0; i < colorTextureCount; i++) {

                    var colorTexDesc = getDesc(gl, colorTexture[i], initTexture, state.textures, state);
                    var glColorTextureTarget = colorTexDesc.target;

                    //attach color texture according to its type
                    var glColorTexture = colorTexDesc.glTexture;
                    var currBoundTexture = getBoundTexture(gl, glColorTextureTarget, state);
                    bindTexture(gl, glColorTextureTarget, glColorTexture, state);
                                        
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentsProperties[i],
                        glColorTextureTarget == gl.TEXTURE_CUBE_MAP ? glCubeFace(gl, renderTarget.cubeMapFace, state) : glColorTextureTarget,
                        glColorTexture, 0);

                    //reset state
                    bindTexture(gl, glColorTextureTarget, currBoundTexture, state);
                }

                gl.bindRenderbuffer(gl.RENDERBUFFER, null);
                bindRenderTarget(gl, currBoundRenderTarget, state);                

                //check if creation succeded
                var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
                if (e !== gl.FRAMEBUFFER_COMPLETE)
                    throw new Error('error initializing render target : ' + e);

                function releasedListener() {
                    deleteRenderTarget(gl, renderTarget, state);
                }

                renderTarget.addEventListener('released', releasedListener);
                renderTargetDesc = renderTargetDescPool.get(renderTarget, releasedListener, glRenderTarget, colorTextureCount, glDepthBuffer, glDepthBufferDataType);
                for (var i = 0; i < colorTextureCount; i++)
                    colorTexture[i].addEventListener('sizeChanged', renderTargetDesc.sizeChangedListener);
                renderTargets[renderTargetID] = renderTargetDesc;
            };

            function deleteRenderTarget(gl, renderTarget, state) {

                var renderTargets = state.renderTargets;
                var renderTargetID = renderTarget.ID;

                var renderTargetDesc = renderTargets[renderTargetID];

                if (renderTargetDesc == null)
                    return;

                renderTargetDesc.release();
                
                /*
                * break bindings if necessary, delete webgl objects
                * do not delete color attachment because it could be re-used by another render target
                */
                if (state.currRenderTarget == renderTarget)
                    setRenderTarget(gl, null, state);

                var glRenderTarget = renderTargetDesc.glRenderTarget;

                if (glRenderTarget == getBoundRenderTarget(gl, state))
                    bindRenderTarget(gl, null, state);

                gl.deleteFramebuffer(glRenderTarget);
                gl.deleteRenderbuffer(renderTargetDesc.glDepthBuffer);
                renderTargets[renderTargetID] = null;
                renderTargetDescPool.release(renderTargetDesc);
            }

        })();
        
        // update render target attachments if necessary
        var updateRenderTarget = (function () {
            return function (gl, renderTargetDesc, state) {

                if (!renderTargetDesc.needsUpdate)
                    return;

                var width;
                var height;

                // update color attachment
                var colorTexture = renderTargetDesc.obj.colorTexture;
                if(colorTexture instanceof Array){
                    var colorTextureCount = renderTargetDesc.colorTextureCount;
                    for(var i = 0 ; i < colorTextureCount; i++)
                        updateTexture(gl, colorTexture[i], state);
                    width = colorTexture[0].width;
                    height = colorTexture[0].height;
                }else{
                    updateTexture(gl, colorTexture, state);
                    width = colorTexture.width;
                    height = colorTexture.height;
                }

                //update depth attachment, i.e. resize it
                gl.bindRenderbuffer(gl.RENDERBUFFER, renderTargetDesc.glDepthBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, renderTargetDesc.glDepthBufferDataType, width, height);
                gl.bindRenderbuffer(gl.RENDERBUFFER, null);

                renderTargetDesc.needsUpdate = false;
            };

            //shortcut for texture update forcing the binding
            function updateTexture(gl, texture, state) {
                var textureDesc = getDesc(gl, texture, initTexture, state.textures, state);
                updateTextureFromDesc(gl, textureDesc, true, state);
            }
        })();
        
        //initializes a buffer object and creates a descriptor for its use
        var initBuffer = (function () {

            return function (gl, buffer, state) {

                var buffers = state.buffers;

                var bufferID = buffer.ID;
                var bufferDesc = buffers[bufferID];

                if (bufferDesc != null)
                    return;

                var target;
                var bufferSize;
                var vertexLayout;
                var indexType;
                var indexSize;
                var bufferType = buffer.type;

                if (bufferType == Buffers.BufferType.VertexBuffer) {
                    target = gl.ARRAY_BUFFER;
                    vertexLayout = buffer.vertexLayout;
                    bufferSize = buffer.vertexCount * vertexLayout.vertexStride;
                }
                else if (bufferType == Buffers.BufferType.IndexBuffer) {
                    target = gl.ELEMENT_ARRAY_BUFFER;
                    indexType = glType(gl, buffer.indexType);

                    switch (indexType) {
                        case gl.UNSIGNED_BYTE:
                            indexSize = Uint8Array.BYTES_PER_ELEMENT;
                            break;
                        case gl.UNSIGNED_SHORT:
                            indexSize = Uint16Array.BYTES_PER_ELEMENT;
                            break;
                        default:
                            throw new Error('unsupported index type');
                    }

                    bufferSize = indexSize * buffer.indexCount;
                }
                else
                    throw new Error('invalid buffer object');

                var glBuffer = gl.createBuffer();
                var boundBuffer = getBoundBuffer(target, state);
                bindBuffer(gl, target, glBuffer, state);

                var glBufferUsage = glUsage(gl, buffer.usage);
                var data = buffer.data;

                //check if data is provided, otherwise allocate a zero-initialized buffer
                if (data == null)
                    gl.bufferData(target, bufferSize, glBufferUsage);
                else
                    gl.bufferData(target, data, glBufferUsage);

                //restore
                bindBuffer(gl, target, boundBuffer, state);

                //add buffer descriptor if necessary
                function releasedListener() {
                    deleteBuffer(gl, buffer, state);
                }

                buffer.addEventListener('released', releasedListener);
                bufferDesc = bufferDescPool.get(buffer, releasedListener, glBuffer, target, glBufferUsage);
                buffer.addEventListener('dataChanged', bufferDesc.dataChangedListener);

                buffers[bufferID] = bufferDesc;

                if (target !== gl.ARRAY_BUFFER) {
                    bufferDesc.glIndexType = indexType;
                    bufferDesc.indexSize = indexSize;                    
                }
            };

            function deleteBuffer(gl, buffer, state) {

                var buffers = state.buffers;

                var bufferID = buffer.ID;
                var bufferDesc = buffers[bufferID];

                if (bufferDesc == null)
                    return;

                bufferDesc.release();
                
                if (state.currIndexBuffer == buffer)
                    setIndexBuffer(null, state);
                else {
                    var currVertexBuffers = state.currVertexBuffers;
                    var i;
                    while ((i = currVertexBuffers.indexOf(buffer)) != -1)
                        currVertexBuffers.splice(i, 1);
                    setVertexBuffers(currVertexBuffers, state);
                }

                var target = bufferDesc.target;
                var glBuffer = bufferDesc.glBuffer;

                if (glBuffer == getBoundBuffer(target, state))
                    bindBuffer(gl, target, null, state);

                gl.deleteBuffer(glBuffer);

                buffers[bufferID] = null;
                bufferDescPool.release(bufferDesc);
            }

        })();

        // updates a bound webgl buffer object (data, parameters, ..) if necessary           
        function updateBufferFromDesc(gl, bufferDesc, state) {

            if (!bufferDesc.needsUpdate)
                return;

            //check for data changes
            if (bufferDesc.dataChanged) {
                var buffer = bufferDesc.obj;
                var bufferData = buffer.data;
                if(bufferData != null)
                    gl.bufferData(bufferDesc.target, bufferData, bufferDesc.glUsage);
                else {
                    var target = bufferDesc.target;
                    if (target == gl.ARRAY_BUFFER)
                        var bufferSize = buffer.vertexCount * buffer.vertexLayout.vertexStride;
                    else
                        var bufferSize = buffer.indexCount * getSizeByGlType(gl, glType(gl, buffer.indexType));
                    gl.bufferData(target, bufferSize, bufferDesc.glUsage);
                }
                bufferDesc.dataChanged = false;
            }

            bufferDesc.needsUpdate = false;
        }
        
        //retrieves a resource descriptor, creating it if necessary
        function getDesc(gl, obj, initFun, initialized, state) {
            var desc = initialized[obj.ID];
            if (desc == null) {
                initFun(gl, obj, state);
                desc = initialized[obj.ID];
            }
            return desc;
        }        

        //makes the device listen to the context lost event fired by the canvas element        
        function setupContextLostHandling(gl, canvas, state) {
            canvas.addEventListener('webglcontextlost', function (event) {
                event.preventDefault();
                onContextLost(gl, state);
            });
            canvas.addEventListener('webglcontextrestored', function (event) {
                onContextRestored(gl, state);
            });
        }

        /*
         * context lost listener, keep references in order to do the initialization 
         * again once the context is restored
         */
        function onContextLost (gl, state) {
            state.device.trigger(contextLostEvent);
        }

        /*
        * context restored listener, resets previous state
        */
        var onContextRestored = (function(){
            return function (gl, state) {

                //cache current state
                var clearColor = state.clearColor;
                var clearDepth = state.clearDepth;
                var viewPort = state.currViewPort;
                var blendState = state.currBlendState;
                var cullState = state.currCullState;
                var depthState = state.currDepthState;
                var primitiveTopology = state.currPrimitiveTopology;

                //cache resource descriptors
                var buffers = state.buffers;
                var textures = state.textures;
                var programs = state.programs;
                var programsVariables = state.programsVariables;
                var shaders = state.shaders;
                var renderTargets = state.renderTargets;

                //cache current pipeline bindings
                var vertexBuffers = state.currVertexBuffers;
                var indexBuffer = state.currIndexBuffer;
                var program = state.currProgram;
                var renderTarget = state.currRenderTarget;

                //set default state
                unsetImplDefault(gl, state);
                setDefault(gl, state);

                //initialize again resources
                initializeResourcesAndRelease(gl, buffers, initBuffer, bufferDescPool, state);
                initializeResourcesAndRelease(gl, textures, initTexture, textureDescPool, state);
                initializeResourcesAndRelease(gl, shaders, initShader, shaderDescPool, state);
                initializeResourcesAndRelease(gl, renderTargets, initRenderTarget, renderTargetDescPool, state);

                //it is necessary to restore previous program variables values                 
                var currProgramsVariables = state.programsVariables;
                for (var programID in programs) {
                    var programDesc = programs[programID];
                    if (programDesc == null)
                        continue;

                    /*
                    * this ensures program initialization even when there are no uniforms, otherwise it could have been done
                    * implicity by setting the uniforms
                    */
                    initProgram(gl, programDesc.obj, state);

                    var uniforms = programDesc.uniforms;

                    for (var uniform in uniforms)
                        setProgramVariable(gl, programDesc.obj, uniform, uniforms[uniform].newValue, state);

                    //keeping the program variables already created, the references to them created by getProgramVariables() are not lost 
                    currProgramsVariables[programID] = programsVariables[programID];

                    //release previous descriptor
                    programDesc.release();
                    programDescPool.release(programDesc);
                }
            
                //set previous state
                setClearColor(gl, clearColor, state);
                setClearDepth(gl, clearDepth, state);
                setViewPort(gl, viewPort, state);
                setBlendState(blendState, state);
                setDepthState(depthState, state);
                setCullState(cullState, state);
                setPrimitiveTopology(primitiveTopology, state);            
                setProgram(program, state);
                setVertexBuffers(vertexBuffers, state);
                setIndexBuffer(indexBuffer, state);
                setRenderTarget(gl, renderTarget, state);
                                           

                //finalize changes
                clearColorAndDepth(gl, state);
                apply(gl, state);

                state.device.trigger(contextRestoredEvent);
            }

            function initializeResourcesAndRelease(gl, descriptors, initFun, pool, state) {
                for (var key in descriptors) {
                    var desc = descriptors[key];
                    if (desc != null) {
                        var obj = desc.obj;                        
                        desc.release();
                        pool.release(desc);
                        initFun(gl, obj, state);
                    }
                }
            }
        })();
                
        //INTERFACE IMPLEMENTATION

        function setPrimitiveTopology(primitiveTopology, state) {

            if (primitiveTopology == null)
                primitiveTopology = state.defaultPrimitiveTopology;

            state.currPrimitiveTopology = glPrimitiveTopology(state.gl, primitiveTopology, state);
        }

        function setVertexBuffers(vertexBuffers, state) {
            
            var vertexBuffersChanged = false;
            var currVertexBuffers = state.currVertexBuffers;
            var currVertexBuffersCount = currVertexBuffers.length;
            var vertexBufferDesc;
            var count;

            if (vertexBuffers == null) {
                Utils.resizeArray(currVertexBuffers, 0);
                count = 0;
            }
            else if (!(vertexBuffers instanceof Array)) {
                //a single vertex buffer is provided
                Utils.resizeArray(currVertexBuffers, 1);
                if (currVertexBuffers[0] != vertexBuffers) {
                    vertexBuffersChanged = true;
                    currVertexBuffers[0] = vertexBuffers;
                } else {
                    vertexBufferDesc = getDesc(state.gl, vertexBuffers, initBuffer, state.buffers, state);
                    if(vertexBufferDesc.needsUpdate)
                        vertexBuffersChanged = true;
                }
                count = 1;

            } else {

                count = vertexBuffers.length;
                Utils.resizeArray(currVertexBuffers, count);
                for (var i = 0 ; i < count; i++) {
                    var vBuff = vertexBuffers[i];
                    if (currVertexBuffers[i] != vBuff) {
                        currVertexBuffers[i] = vBuff;
                        vertexBuffersChanged = true;
                    } else {
                        vertexBufferDesc = getDesc(state.gl, vBuff, initBuffer, state.buffers, state);
                        if(vertexBufferDesc.needsUpdate)
                            vertexBuffersChanged = true;
                    }
                }
            }
            vertexBuffersChanged = vertexBuffersChanged || count != currVertexBuffersCount;
            if (vertexBuffersChanged) 
                state.vertexBuffersChanged = true;
        }
                
        function setIndexBuffer(indexBuffer, state) {
            state.currIndexBuffer = indexBuffer;
        }
                
        function setProgram(program, state) {
            if (state.currProgram != program) {
                state.programChanged = true;
                state.currProgram = program;
            }
        }
                
        function setProgramVariable(gl, program, name, value, state) {

            if (value == null)
                return;

            var programDesc = getDesc(gl, program, initProgram, state.programs, state);
            var uniforms = programDesc.uniforms;
            var uniformDesc = uniforms[name];
            if (uniformDesc == null)
                throw new Error('invalid variable name');
            
            /*
             * add the variable to the dirty list if it's not a sampler, there is a specific handler for them
             * (handleTextures) 
             */
            if (uniformDesc.type !== gl.SAMPLER_2D && uniformDesc.type !== gl.SAMPLER_CUBE)
                programDesc.dirtyUniforms.push(uniformDesc);

            /*
             * if the value is an array and the program variable has a size of one, just get the first element, 
             * this could be useful in cases where the actual size is not known (e.g. array of samplers with size 
             * defined by a preprocessor macro) and results in just 1
             */
            var storeFun = uniformDesc.storeElementFun;
            if (value instanceof Array && uniformDesc.size == 1 && (typeof value[0] == 'number'))
                value = value[0];

            //Vector*, Matrix*, ...
            if (value.hasOwnProperty('data'))
                value = value.data;

            uniformDesc.newValue = value;
        }
                
        function setRenderTarget(gl, renderTarget, state) {

            var currRenderTarget = state.currRenderTarget;
            if (currRenderTarget == renderTarget)
                return;

            state.renderTargetChanged = true;
            
            //generate mipmaps of the previous render target if needed
            if (currRenderTarget != null && currRenderTarget.generateMipMaps)
                generateRendertargetMipMaps(gl, currRenderTarget, state);
            
            state.currRenderTarget = renderTarget;
        }
        
        function setBlendState(blendState, state) {            
            if (blendState == null)
                blendState = state.defaultBlendState;
            state.newBlendState = blendState;
        }
                
        function setCullState(cullState, state) {            
            if (cullState == null)
                cullState = state.defaultCullState;
            state.newCullState = cullState;
        }
                
        function setDepthState(depthState, state) {            
            if (depthState == null)
                depthState = state.defaultDepthState;
            state.newDepthState = depthState;
        }
                
        function setViewPort(gl, viewPort, state) {                        
            if (viewPort == null)
                viewPort = state.defaultViewPort;
            state.newViewPort = viewPort;
        }

        function setScissor(gl, scissor, state) {
            if (scissor == null)
                scissor = state.defaultScissor;
            state.newScissor = scissor;
        }

        function setClearColor(gl, color, state) {
            var currClearColor = state.clearColor;

            if (color == null)
                color = state.defaultClearColor;
            else if (color.data != null)
                color = color.data;

            var currR = currClearColor[0];
            var currG = currClearColor[1];
            var currB = currClearColor[2];
            var currA = currClearColor[3];

            var r = color[0];
            var g = color[1];
            var b = color[2];
            var a = color[3];

            if (currR != r || currG != g || currB != b || currA != a)
                gl.clearColor(r, g, b, a);

            state.clearColor = color;
        }

        function setClearDepth(gl, depth, state) {
            var currClearDepth = state.clearDepth;

            if (depth == null)
                depth = state.defaultClearDepth;

            if (currClearDepth !== depth) {
                gl.clearDepth(depth);
                state.clearDepth = depth;
            }
        }

        function setClearColorAndDepth(gl, color, depth, state) {
            setClearColor(gl, color, state);
            setClearDepth(gl, depth, state);
        }

        function clearDepth(gl, state) {
            state.pendingClearDepth = true;
        }

        function clearColor(gl, state) {
            state.pendingClearColor = true;
        }

        function clearColorAndDepth(gl, state) {
            clearColor(gl, state);
            clearDepth(gl, state);
        }

        var apply = (function () {                      
                       
            
            var bindAttributes = (function () {
                            
                return function (gl, vertexBuffers, programAttributes, state) {

                    var attributeBufferMap = state.attributeBufferMap;
                    //clear current map
                    Utils.nullifyObjectKeys(attributeBufferMap);
                    buildAttributeMap(attributeBufferMap, vertexBuffers);

                    var attributeBindings = state.attributeBindings;

                    var maxVertexCount = Number.POSITIVE_INFINITY;
                    var vertexBuffersCount = vertexBuffers.length;
                    var pendingBindings = state.pendingBindings;
                    Utils.emptyArray(pendingBindings);

                    var bufferPendingBindings;
                    var attributesCount = programAttributes.length;

                    var newlyEnabledAttributes = state.newlyEnabledAttributes;
                    Utils.nullifyObjectKeys(newlyEnabledAttributes);

                    var vertexBufferDesc;

                    for (var i = 0; i < attributesCount; i++) {

                        var programAttributeDesc = programAttributes[i];
                        var attribute = programAttributeDesc.name;

                        var vertexBufferIndex = attributeBufferMap[attribute];

                        //check if the current vertex buffers provide the attribute
                        if (vertexBufferIndex == null)
                            throw new Error('invalid vertex buffers-program binding, missing attribute');

                        var vertexBuffer = vertexBuffers[vertexBufferIndex];
                        vertexBufferDesc = getDesc(gl, vertexBuffer, initBuffer, state.buffers, state);
                        maxVertexCount = Math.min(maxVertexCount, vertexBuffer.vertexCount);

                        var locationsUsed = programAttributeDesc.elementsCount;
                        var baseLoc = programAttributeDesc.location;

                        for (var j = 0 ; j < locationsUsed; j++) {

                            var attrLoc = baseLoc + j;

                            //enable attribute location
                            newlyEnabledAttributes[attrLoc] = true;

                            //verify current binding
                            var bindingDesc = attributeBindings[attrLoc];

                            var needsBind = true;

                            if (bindingDesc != null) {

                                var boundAttr = bindingDesc.attributeName;
                                var boundBuff = bindingDesc.buffer;

                                if (boundAttr === attribute && boundBuff === vertexBuffer)
                                    needsBind = false;
                            } else {
                                bindingDesc = {};
                                attributeBindings[attrLoc] = bindingDesc;
                            }

                            if (!needsBind && !vertexBufferDesc.needsUpdate)
                                continue;

                            //cache new binding
                            bindingDesc.attributeName = attribute;
                            bindingDesc.buffer = vertexBuffer;

                            //enqueue the binding
                            bufferPendingBindings = pendingBindings[vertexBufferIndex];
                            if (bufferPendingBindings == null) {
                                bufferPendingBindings = Pools.ObjectPool.get();
                                var attrs = Pools.ArrayPool.get();
                                attrs.push(i);
                                bufferPendingBindings.attributes = attrs;
                                pendingBindings[vertexBufferIndex] = bufferPendingBindings;
                            } else
                                bufferPendingBindings.attributes.push(i);
                        }
                    }

                    state.currMaxVertexCount = maxVertexCount;

                    var bufferDesc;
                    
                    var bufferAttributes;
                    var bufferAttributesCount;
                    var vertexStride;
                    var vertexLayout;
                    
                    //make the bindings

                    for (i = 0; i < vertexBuffersCount; i++) {

                        //get buffer pending bindings
                        bufferPendingBindings = pendingBindings[i];

                        if (bufferPendingBindings == null)
                            //no bindings
                            continue;

                        vertexBuffer = vertexBuffers[i];
                        vertexBufferDesc = getDesc(gl, vertexBuffer, initBuffer, state.buffers, state);

                        bindBuffer(gl, gl.ARRAY_BUFFER, vertexBufferDesc.glBuffer, state);

                        updateBufferFromDesc(gl, vertexBufferDesc, state);

                        bufferAttributes = bufferPendingBindings.attributes;
                        bufferAttributesCount = bufferAttributes.length;

                        vertexLayout = vertexBuffer.vertexLayout;
                        vertexStride = vertexLayout.vertexStride;                        
                        for (var j = 0; j < bufferAttributesCount; j++) {
                            programAttributeDesc = programAttributes[bufferAttributes[j]];                            
                            bindAttribPointer(gl, vertexLayout.getAttributeDescByName(programAttributeDesc.name), vertexStride, programAttributeDesc);
                        }

                        Pools.ArrayPool.release(bufferPendingBindings.attributes);
                        Pools.ObjectPool.release(bufferPendingBindings);
                    }         

                    finalizeEnableAttribPointer(gl, newlyEnabledAttributes, state.enabledAttributes);
                };

                /*
                * builds the map : attribute -> index, where index is the index of 
                * the buffer in vertexBuffers in which the attribute data is located
                */
                function buildAttributeMap(attributeBufferMap, vertexBuffers) {
                    var vertexBuffersCount = vertexBuffers.length
                    for (var i = 0; i < vertexBuffersCount; i++) {
                        var vertexBuffer = vertexBuffers[i];
                        var vertexLayout = vertexBuffer.vertexLayout;                        
                        var attributesCount = vertexLayout.attributeDescsCount;
                        for (var j = 0; j < attributesCount; j++)
                            attributeBufferMap[vertexLayout.getAttributeDesc(j).name] = i;
                    }
                }

                function bindAttribPointer(gl, attributeDesc, vertexStride, programAttributeDesc) {

                    var location = programAttributeDesc.location;
                    var elementSize = programAttributeDesc.elementSize;
                    var elementsCount = programAttributeDesc.elementsCount;

                    var type = glType(gl, attributeDesc.componentType);
                    var elementStride = getSizeByGlType(gl, type) * elementSize;

                    for (var i = 0; i < elementsCount; i++)
                        gl.vertexAttribPointer(location + i, elementSize, type, false, vertexStride, attributeDesc.offset + i * elementStride);
                }

                function finalizeEnableAttribPointer(gl, newlyEnabledAttributes, enabledAttributes) {
                    
                    for (var key in newlyEnabledAttributes)
                        if (newlyEnabledAttributes[key] === true) {
                            if (enabledAttributes[key] !== true) {
                                gl.enableVertexAttribArray(key);
                                enabledAttributes[key] = true;
                            }
                        }

                    //disable unused attributes
                    for (var key in enabledAttributes) {
                        var enabled = enabledAttributes[key] === true;
                        if (enabled && newlyEnabledAttributes[key] !== true) {
                            gl.disableVertexAttribArray(key);
                            enabledAttributes[key] = false;
                        }
                    }                    
                }

            })();

            
            var handleTextures = (function () {
                return function (gl, programDesc, state) {

                    var uniforms = programDesc.samplerUniforms;
                    var dirtyUniforms = programDesc.dirtyUniforms;
                    var textureUnitMap = state.textureUnitMap;

                    var renderTexture = state.currRenderTarget;
                    renderTexture = renderTexture != null ? renderTexture.colorTexture : null;

                    var textures = state.textures;
                    var samplerCount = uniforms.length;

                    for (var i = 0; i < samplerCount; i++) {

                        var uniformDesc = uniforms[i];
                        var uniformType = uniformDesc.type;
                        var target = null;

                        var uniformValue = uniformDesc.newValue;

                        //if array and no value has been provided
                        //just assign each element
                        if (uniformDesc.hasSubscript && uniformValue == null)
                            continue;

                        //get texture and its descriptor
                        switch (uniformType) {
                            case gl.SAMPLER_2D:
                                target = gl.TEXTURE_2D;
                                break;
                            case gl.SAMPLER_CUBE:
                                target = gl.TEXTURE_CUBE_MAP;
                                break;
                        }

                        if (target == null)
                            throw new Error();

                        var size = uniformDesc.size;
                        var uniformUnitValues = uniformDesc.value;
                        var getTextFun;
                        var assignFun;
                        var readFun;

                        if (size > 1) {
                            getTextFun = getTextureArray;
                            assignFun = assignValueArray;
                            readFun = readValueArray;

                            if (uniformUnitValues == null) {
                                uniformUnitValues = new state.textureUnitArrayCtor(size);
                                uniformDesc.value = uniformUnitValues;
                            }
                        }
                        else {
                            getTextFun = getTexture;
                            assignFun = assignValue;
                            readFun = readValue;
                        }

                        for (var j = 0 ; j < size ; j++) {

                            var texture = getTextFun(uniformValue, j);

                            if (texture != null && texture.type == Textures.TextureType.RenderTarget)
                                texture = texture.colorTexture;

                            var textureUnit;

                            if (texture != null && texture != renderTexture) {

                                var textureDesc = getDesc(gl, texture, initTexture, textures, state);

                                textureUnit = textureDesc.textureUnit;

                                var boundTexture = textureUnit != null ? getBoundTexture(gl, target, state, textureUnit) : null;
                                var glTexture = textureDesc.glTexture;

                                if (textureUnit == null || textureUnitMap[textureUnit] != null || boundTexture != glTexture) {
                                    textureUnit = findAvailableTextureUnit(gl, textureUnitMap, state);
                                    bindTexture(gl, target, glTexture, state, textureUnit);
                                    textureDesc.textureUnit = textureUnit;
                                }
                                setTextureUnit(gl, textureUnit, state);
                                updateTextureFromDesc(gl, textureDesc, false, state);
                            } else
                                textureUnit = findAvailableTextureUnit(gl, textureUnitMap, state);

                            textureUnitMap[textureUnit] = uniformDesc;
                            textureUnit -= gl.TEXTURE0;

                            if (readFun(uniformDesc, j) !== textureUnit)
                                assignFun(uniformDesc, j, textureUnit, dirtyUniforms);
                        }
                    }

                    //clear texture unit map
                    Utils.nullifyObjectKeys(textureUnitMap);
                };

                /// assumption : a texture unit is available if neither a TEXTURE_2D nor a TEXTURE_CUBE is bound in it    
                function findAvailableTextureUnit(gl, textureUnitMap, state) {

                    var boundTextures = state.boundTextures;
                    var textureUnit = gl.TEXTURE0;
                    var textureUnitCount = state.limits.MAX_COMBINED_TEXTURE_IMAGE_UNITS;
                    var textureUnitBinding;
                    var i;

                    //iterate over all the possible texture unit        
                    for (i = 0; i < textureUnitCount; i++) {
                        textureUnitBinding = boundTextures[textureUnit];

                        if (textureUnitBinding == null || (textureUnitBinding[gl.TEXTURE_2D] == null && textureUnitBinding[gl.TEXTURE_CUBE_MAP] == null))
                            break;
                        textureUnit++;
                    }

                    //no texture unit available, choose one no in textureUnitMap
                    if (i == textureUnitCount) {

                        textureUnit = gl.TEXTURE0;

                        for (i = 0; i < textureUnitCount; i++) {
                            if (textureUnitMap[textureUnit] == null)
                                return textureUnit;
                            textureUnit++;
                        }

                        //what the hell ?
                        throw new Error('unavailable texture unit');
                    }

                    return textureUnit;
                }

                function assignValueArray(desc, i, value, dirtyUniforms) {
                    desc.value[i] = value;
                    dirtyUniforms.push(desc);
                }

                function assignValue(desc, i, value, dirtyUniforms) {
                    desc.value = value;
                    dirtyUniforms.push(desc);
                }

                function getTextureArray(uniformValue, i) {
                    return uniformValue[i];
                }

                function getTexture(uniformValue, i) {
                    return uniformValue;
                }

                function readValueArray(desc, i) {
                    return desc.value[i];
                }

                function readValue(desc, i) {
                    return desc.value;
                }

            })();

            // sets the new blend state if necessary
            var handleBlendState = (function () {
                return function (gl, state) {

                    var currBlendState = state.currBlendState;
                    var blendState = state.newBlendState;
                    var srcRGB;
                    var srcAlpha;
                    var dstRGB;
                    var dstAlpha;
                    var eqRGB;
                    var eqAlpha;

                    if (currBlendState !== blendState) {

                        if (blendState === States.BlendState.NONE)
                            //only this state requires blending disabled, so at this point it is enabled
                            gl.disable(gl.BLEND);
                        else {

                            if (currBlendState === States.BlendState.NONE)
                                //all the states but NONE require blending enabled
                                gl.enable(gl.BLEND);

                            //find parameters
                            switch (blendState) {
                                case States.BlendState.ADD_BLEND:
                                    eqRGB = eqAlpha = gl.FUNC_ADD;
                                    srcRGB = srcAlpha = dstRGB = dstAlpha = gl.ONE;
                                    break;
                                case States.BlendState.SUB_BLEND:
                                    eqRGB = eqAlpha = gl.FUNC_SUBTRACT;
                                    srcRGB = srcAlpha = dstRGB = dstAlpha = gl.ONE;
                                    break;
                                case States.BlendState.MUL_BLEND:
                                    eqRGB = eqAlpha = gl.FUNC_ADD;
                                    srcRGB = srcAlpha = gl.ZERO;
                                    dstRGB = dstAlpha = gl.SRC_COLOR;
                                    break;
                                case States.BlendState.ALPHA_BLEND:
                                    eqRGB = eqAlpha = gl.FUNC_ADD;
                                    srcRGB = srcAlpha = gl.SRC_ALPHA;
                                    dstRGB = dstAlpha = gl.ONE_MINUS_SRC_ALPHA;
                                    break;
                                case States.BlendState.ADD_ALPHA_BLEND:
                                    eqRGB = eqAlpha = gl.FUNC_ADD;
                                    srcRGB = srcAlpha = gl.SRC_ALPHA;
                                    dstRGB = dstAlpha = gl.ONE;                                    
                                    break;
                                case States.BlendState.NO_COLOR:
                                    eqRGB = eqAlpha = gl.FUNC_ADD;
                                    srcRGB = srcAlpha = gl.ZERO;
                                    dstRGB = dstAlpha = gl.ONE;
                                    break;
                                default:
                                    throw new Error('invalid blend mode');
                            }

                            //set the new blending parameters
                            setBlendEquation(gl, eqRGB, eqAlpha, state);
                            setBlendFunction(gl, srcRGB, srcAlpha, dstRGB, dstAlpha, state);
                        }

                        //cache state
                        state.currBlendState = blendState;
                    }
                };
                                
                //sets a new blend equation parameters, avoid redundant state changes
                function setBlendEquation(gl, eqRGB, eqAlpha, state) {

                    var currRGB = state.currBlendRGBEq;
                    var currAlpha = state.currBlendAlphaEq;
                    
                    // check for at least one state change
                    if (eqRGB !== currRGB || eqAlpha !== currAlpha) {

                        if (eqRGB !== eqAlpha)
                            gl.blendEquationSeparate(eqRGB, eqAlpha);
                        else                            
                            gl.blendEquation(eqRGB);

                        state.currBlendRGBEq = eqRGB;
                        state.currBlendAlphaEq = eqAlpha;
                    }
                }

                //sets a new blend function parameters, avoid redundant state changes
                function setBlendFunction(gl, srcRGB, srcAlpha, dstRGB, dstAlpha, state) {

                    var currSrcRGB = state.currBlendRGBSrcFunc;
                    var currDstRGB = state.currBlendRGBDestFunc;
                    var currSrcAlpha = state.currBlendAlphaSrcFunc;
                    var currDstAlpha = state.currBlendAlphaDestFunc;

                    // check for at least one state change
                    if (srcRGB !== currSrcRGB || srcAlpha !== currSrcAlpha || dstRGB !== currDstRGB || dstAlpha !== currDstAlpha) {

                        if (srcRGB !== srcAlpha || dstRGB !== dstAlpha)
                            gl.blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha);
                        else
                            gl.blendFunc(srcRGB, dstRGB);

                        state.currBlendRGBSrcFunc = srcRGB;
                        state.currBlendRGBDestFunc = dstRGB;
                        state.currBlendAlphaSrcFunc = srcAlpha;
                        state.currBlendAlphaDestFunc = dstAlpha;
                    }
                }
            })();
                       

            // sets the new viewport if necessary
            function handleViewPort(gl, state) {

                var currViewPort = state.currViewPort;
                var newViewPort = state.newViewPort;
                if (newViewPort == currViewPort)
                    return;

                //cache
                state.currViewPort = newViewPort;

                //change viewport if necessary
                var x = newViewPort.x;
                var y = newViewPort.y;
                var width = newViewPort.width;
                var height = newViewPort.height;

                if (x !== currViewPort.x || y !== currViewPort.y || width !== currViewPort.width || height !== currViewPort.height)
                    gl.viewport(x, y, width, height);
            }

            // sets the new scissor if necessary
            function handleScissor(gl, state) {

                var currScissor = state.currScissor;
                var newScissor = state.newScissor;
                if (currScissor == newScissor)
                    return;

                // cache
                state.currScissor = newScissor;

                if (newScissor == state.defaultScissor) {
                    /*
                    * default scissor corresponds to the entire webgl canvas with the scissor test disables, 
                    * so disabling the scissor test is enough
                    */
                    gl.disable(gl.SCISSOR_TEST);
                    return;
                }

                //ensure the scissor test is enabled, set the new scissor parameters if necessary
                gl.enable(gl.SCISSOR_TEST);

                var x = newScissor.x;
                var y = newScissor.y;
                var width = newScissor.width;
                var height = newScissor.height;

                if (x !== currScissor.x || y !== currScissor.y || width !== currScissor.width || height !== currScissor.height)
                    gl.scissor(x, y, width, height);
            }

            // sets the new cull state if necessary
            function handleCullState(gl, state) {

                var currCullState = state.currCullState;
                var cullState = state.newCullState;

                if (currCullState !== cullState) {

                    if (cullState === States.CullState.NONE)
                        //only this state requires face culling disabled, so at this point it is enabled
                        gl.disable(gl.CULL_FACE);
                    else {

                        if (currCullState === States.CullState.NONE)
                            //all the states but NONE require face culling enabled
                            gl.enable(gl.CULL_FACE);

                        gl.cullFace(glCullState(gl, cullState));
                    }

                    //cache the new state
                    state.currCullState = cullState;
                }
            }

            // sets the new depth state if necessary
            function handleDepthState(gl, state) {

                var currDepthState = state.currDepthState;
                var depthState = state.newDepthState;

                if (currDepthState !== depthState) {

                    if (depthState === States.DepthState.NONE)
                        //only this state requires depth test disabled, so at this point it is enabled
                        gl.disable(gl.DEPTH_TEST);

                    else {

                        if (currDepthState === States.DepthState.NONE)
                            //all the states but NONE require depth test enabled
                            gl.enable(gl.DEPTH_TEST);

                        gl.depthFunc(glDepthState(gl, depthState));
                    }

                    //cache the new state
                    state.currDepthState = depthState;
                }
            }

            //APPLY
            return function (gl, state) {
                                
                var program = state.currProgram;

                if (program != null) {

                    var vertexBuffers = state.currVertexBuffers;

                    //set program
                    var programDesc = getDesc(gl, program, initProgram, state.programs, state);
                    bindProgram(gl, programDesc.glProgram, state);

                    if (state.programChanged || state.vertexBuffersChanged) {

                        //handle attributes bindings
                        bindAttributes(gl, vertexBuffers, programDesc.attributes, state);                        

                        state.programChanged = false;
                        state.vertexBuffersChanged = false;

                    } else {

                        //ensure vertex buffers updates
                        var vertexBuffersCount = vertexBuffers.length;
                        var buffers = state.buffers;
                        var target = gl.ARRAY_BUFFER;                       
                        var boundBuffer = getBoundBuffer(target, state);
                        for (var i = 0 ; i < vertexBuffersCount; i++) {
                            var buffDesc = getDesc(gl, vertexBuffers[i], initBuffer, buffers, state);
                            bindBuffer(gl, target, buffDesc.glBuffer, state);
                            updateBufferFromDesc(gl, buffDesc, state);
                            //it's useless bind boundBuffer again, so bind it after all the updates are done
                        }                        
                        bindBuffer(gl, target, boundBuffer, state);
                    }

                    //uniforms
                    handleTextures(gl, programDesc, state);

                    var uniforms = programDesc.dirtyUniforms;
                    var dirtyCount = uniforms.length;

                    if (dirtyCount > 0) {
                        for (var i = 0 ; i < dirtyCount; i++) {

                            var uniformDesc = uniforms[i];

                            var uniformType = uniformDesc.type;
                            var uniformValue = null;

                            /*
                            * sampler uniforms requires a special treatment : 
                            * the uniform value is the texture unit the texture is bound to
                            * and this is stored in the value attribute of the uniform descriptor
                            */
                            switch (uniformType) {
                                case gl.SAMPLER_2D:
                                case gl.SAMPLER_CUBE:
                                    uniformValue = uniformDesc.value;
                                    break;
                                default:
                                    uniformValue = uniformDesc.newValue;
                            }

                            uniformDesc.storeElementFun(gl, uniformDesc.location, uniformValue);
                        }
                        //reset dirty uniforms
                        Utils.emptyArray(uniforms);
                    }
                }
                                
                var update = false;

                //set index buffer
                var indexBuffer = state.currIndexBuffer;                
                var glIndexBuffer = null;
                
                if (indexBuffer != null) {
                    var indexBufferDesc = getDesc(gl, indexBuffer, initBuffer, state.buffers, state);
                    glIndexBuffer = indexBufferDesc.glBuffer;

                    //check for updates
                    update = true;

                    //set the parameters needed to perform a indexed draw calls
                    state.currMaxIndexCount = indexBuffer.indexCount;                    
                    state.currIndexType = indexBufferDesc.glIndexType;
                    state.currIndexSize = indexBufferDesc.indexSize;                    
                }

                //if glIndexBuffer is null, previously bindings are broken
                bindBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, glIndexBuffer, state);

                //update index buffer after bind
                if (update) {                    
                    updateBufferFromDesc(gl, indexBufferDesc, state);
                    update = false;
                }

                //set render target
                var renderTarget = state.currRenderTarget;
                var glRenderTarget = null;

                if (renderTarget != null) {
                    var renderTargetDesc = getDesc(gl, renderTarget, initRenderTarget, state.renderTargets, state);
                    glRenderTarget = renderTargetDesc.glRenderTarget;

                    //check for updates
                    update = true;
                }

                //if glRenderTarget is null the default render target is used
                bindRenderTarget(gl, glRenderTarget, state);
                if (update)
                    updateRenderTarget(gl, renderTargetDesc, state);

                //set scissor now because it affects clearing operations
                handleScissor(gl, state);

                //clearing bound render target if necessary
                var pendingClearFlags = 0;

                if (state.pendingClearColor) {
                    pendingClearFlags |= gl.COLOR_BUFFER_BIT;
                    state.pendingClearColor = false;
                }
                if (state.pendingClearDepth) {
                    pendingClearFlags |= gl.DEPTH_BUFFER_BIT;
                    state.pendingClearDepth = false;
                }

                if (pendingClearFlags != 0)
                    gl.clear(pendingClearFlags);
                
                //self-explanatory
                handleViewPort(gl, state);
                handleBlendState(gl, state);
                handleCullState(gl, state);
                handleDepthState(gl, state);
            };

        })();
        
                
        var getProgramVariables = (function () {
            return function (gl, program, state) {

                var programID = program.ID;
                var programsVariables = state.programsVariables;

                var variablesDesc = programsVariables[programID];
                if (variablesDesc != null)
                    return variablesDesc.variables;

                var variables = {};
                var listeners = {};

                var programDesc = getDesc(gl, program, initProgram, state.programs, state);

                var uniforms = programDesc.uniforms;
                var parsedUniforms = programDesc.parsedUniforms;

                for (var key in parsedUniforms)
                    variables[key] = createProgramVariable(gl, program, parsedUniforms[key], uniforms, listeners, state);

                variablesDesc = {};
                variablesDesc.variables = variables;
                variablesDesc.listeners = listeners;
                programsVariables[programID] = variablesDesc;

                return variables;
            };

            function createProgramVariable(gl, program, uniformDesc, uniforms, listeners, state) {

                var name = uniformDesc.name;

                if (uniformDesc.hasOwnProperty('elements')) {

                    var elements = uniformDesc.elements;
                    var elementCount = elements.length;
                    var programVariables = new Array(elementCount);

                    for (var i = 0 ; i < elementCount; i++)
                        programVariables[i] = createProgramVariable(gl, program, elements[i], uniforms, listeners, state);

                    var variable = ProgramVariables.createProgramVariableArray(name, programVariables);


                } else if (uniformDesc.hasOwnProperty('fields')) {

                    var fields = uniformDesc.fields;
                    var programVariables = {};

                    for (var f in fields) {
                        var field = fields[f];
                        programVariables[f] = createProgramVariable(gl, program, field, uniforms, listeners, state);
                    }

                    return ProgramVariables.createProgramVariableStruct(name, programVariables);

                } else
                    var variable = ProgramVariables.createProgramVariable(name);

                var listener = function () {
                    setProgramVariable(gl, program, variable.name, variable.value, state);
                };

                variable.addEventListener('dirty', listener);
                listeners[name] = listener;

                return variable;
            }

        })();
        
        function deleteProgramVariable(variable, listeners){
        
            if (variable.type == ProgramVariables.ProgramVariableType.ProgramVariableArray){
            
                for(var key in variable)
                    deleteProgramVariable(variable[key], listeners);

            }else if(variable.type == ProgramVariables.ProgramVariableType.ProgramVariableStruct){
            
                for(var key in variable)
                    deleteProgramVariable(variable[key], listeners);

                return;
            }

            variable.removeEventListener('dirty', listeners[variable.name]);
            variable.release();
        }
        
        function drawAuto(gl, state) {
            if (state.currIndexBuffer != null)
                drawIndexed(gl, state);
            else
                draw(gl, state);
        }
        
        function drawIndexed(gl, state) {
            var indexCount = state.currMaxIndexCount;
            if(indexCount > 0)
                gl.drawElements(state.currPrimitiveTopology, indexCount, state.currIndexType, 0);        
        }

        function draw(gl, state) {
            var vertexCount = state.currMaxVertexCount;
            if(vertexCount > 0)
                gl.drawArrays(state.currPrimitiveTopology, 0, vertexCount);
        }

        function drawSubSet(gl, startIndex, vertexCount, state) {
            gl.drawArrays(state.currPrimitiveTopology, startIndex, vertexCount);
        }

        function drawIndexedSubSet(gl, startIndex, indexCount, state) {        
            var offset = state.currIndexSize * startIndex;
            gl.drawElements(state.currPrimitiveTopology, indexCount, state.currIndexType, offset);
        }       

        function resize(gl, width, height, state) {

            var defaultViewPort = state.defaultViewPort;
            var defaultScissor = state.defaultScissor;

            var currWidth = defaultViewPort.width;
            var currHeight = defaultViewPort.height;

            if (currWidth != width || currHeight != height) {

                var canvas = state.canvas;
                canvas.width = width;
                canvas.height = height;
                
                defaultViewPort.release();
                defaultScissor.release();

                var newDefaultViewPort = Rectangles.createViewPort(width, height, 0, 0);
                var newDefaultScissor = Rectangles.createScissor(width, height, 0, 0);
                state.defaultViewPort = newDefaultViewPort;
                state.defaultScissor = newDefaultScissor;

                if (state.currViewPort == defaultViewPort) {
                    gl.viewport(0, 0, width, height);
                    state.currViewPort = newDefaultViewPort;
                }
                if (state.newViewPort == defaultViewPort)
                    state.newViewPort = newDefaultViewPort;

                if (state.currScissor == defaultScissor) {
                    gl.scissor(0, 0, width, height);
                    state.currScissor = newDefaultScissor;
                }

                if (state.newScissor == defaultScissor)
                    state.newScissor = newDefaultScissor;
                                
                state.device.trigger(resizeEvent);

                return true;
            }

            return false;
        }


        return Device;
    });