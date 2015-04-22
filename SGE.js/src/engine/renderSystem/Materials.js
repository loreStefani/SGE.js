define(['core/EventTarget', 'core/VMath', 'core/States', './Programs'],

    function (EventTarget, VMath, States, Programs) {

        'use strict';

        var Names = Programs.Names.uniforms;
        var Defines = Programs.Defines;

        function Material() {

            EventTarget.call(this);
            
            var blendState = null;
            var depthState = null; 
            var cullState = null;
          
            var programVariablesDescs = [];

            Object.defineProperties(this, {

                vertexShaderSrc : {
                    value: Programs.ShaderSources.genericVertexShader,
                    configurable : true
                },

                fragmentShaderSrc : {
                    value: Programs.ShaderSources.genericFragmentShader,
                    configurable : true
                },

                defines : {
                    value: '',
                    configurable : true
                },
                               
                blendState: {
                    get : function(){
                        return blendState;
                    },
                    set : function(v){
                        blendState = v;
                    }
                },

                depthState: {
                    get : function(){
                        return depthState;
                    },
                    set : function(v){
                        depthState = v;
                    }                    
                },

                cullState: {
                    get : function(){
                        return cullState;
                    },

                    set : function(v){
                        cullState = v;
                    }                    
                },
                                
                addProgramVariableDesc : {
                    value: function (programVariableDesc) {
                        programVariablesDescs.push(programVariableDesc);
                    }
                },

                removeProgramVariableDesc : {
                    value: function (programVariableDesc) {
                        var index = programVariablesDescs.indexOf(programVariableDesc);
                        if (index != -1) 
                            programVariablesDescs.splice(index, 1);                        
                    }
                },

                programVariableDescCount : {
                    get: function () {
                        return programVariablesDescs.length;
                    }
                },

                getProgramVariableDesc : {
                    value: function (index) {
                        return programVariablesDescs[index];
                    }
                }
            });
        }
       
        Material.prototype = Object.create(EventTarget.prototype);

        function ProgramVariableDesc(shaderName, checkFun, setFun) {

            Object.defineProperties(this, {

                shaderName: {
                    value : shaderName
                },

                checkFun : {
                    value : checkFun
                },

                setFun: {
                    value : setFun
                }
            });
        }

        function SimpleVariable(variableShaderName, propertyName, initValue, setFun) {

            var value = initValue;
            var valueNeedsUpdate = false;
                        
            var varDesc = new ProgramVariableDesc(variableShaderName,

                function () {
                    return valueNeedsUpdate;
                },

                function (programVariable) {
                    programVariable.value = value;
                    valueNeedsUpdate = false;
                });

            this.addProgramVariableDesc(varDesc);
            varDesc = null;

            if (setFun == null)
                setFun = replaceSetFun;

            Object.defineProperty(this, propertyName, {

                get: function () {
                    return value;
                },

                set: function (v) {
                    value = setFun(value, v);
                    valueNeedsUpdate = true;
                }
            });
        }

        function replaceSetFun(value, v) {
            return v;
        }
        
        function copyVector4SetFun(value, v) {
            if (v != null)                
                value.fromVector4(v);
            return value;
        }

        function BumpMaterial() {
            SimpleVariable.call(this, Names.bumpMap, 'bumpMap');            
        }

        function TextureMaterial() {
            SimpleVariable.call(this, Names.colorMap, 'colorMap');            
        }

        function SpecularMapMaterial() {
            SimpleVariable.call(this, Names.specularMap, 'specMap');
        }

        function TextureTransformMaterial() {
            SimpleVariable.call(this, Names.textCoordTransform, 'textCoordTransform');
        }

        function ColorMaterial() {
            SimpleVariable.call(this, Names.color, 'color', new VMath.Vector4(), copyVector4SetFun);
        }

        function ReflectiveMaterial() {                        
            SimpleVariable.call(this, Names.environmentMap, 'envMap');
            SimpleVariable.call(this, Names.materialReflect, 'reflect', new VMath.Vector4(), copyVector4SetFun);            
        }

        function DisplacementMaterial() {
            SimpleVariable.call(this, Names.displacementMap, 'displMap');
            SimpleVariable.call(this, Names.displacementFactor, 'displFactor');            
        }

        function LitMaterial(){

            var values = new VMath.Vector4Array(3);            
            
            SimpleVariable.call(this, Names.materialAmbient, 'ambient', values.get(0), copyVector4SetFun);
            SimpleVariable.call(this, Names.materialDiffuse, 'diffuse', values.get(1), copyVector4SetFun);
            SimpleVariable.call(this, Names.materialSpecular, 'specular', values.get(2), copyVector4SetFun);
        }

        function SSAOMaterial() {
            SimpleVariable.call(this, Names.ssaoMap, 'ssaoMap');
        }
        
        function makeMaterial(parameters, mat) {

            var material = mat != null ? mat : new Material();
            var defines = {};
            var properties = {};
            
            material.blendState = parameters.blendState;
            material.cullState = parameters.cullState;
            material.depthState = parameters.depthState;

            var color = parameters.color;
            var colorMap = parameters.colorMap;

            if (color != null) {
                ColorMaterial.call(material);
                material.color = color;
                defines[Defines.color] = true;

            }else if (colorMap != null) {
                TextureMaterial.call(material);
                material.colorMap = colorMap;
                defines[Defines.colorMap] = true;                
            }

            var bumpMap = parameters.bumpMap;

            if (bumpMap != null) {
                BumpMaterial.call(material);
                material.bumpMap = bumpMap;
                defines[Defines.bumpMap] = true;                
            }

            var specMap = parameters.specMap;

            if (specMap != null) {
                SpecularMapMaterial.call(material);
                material.specMap = specMap;
                defines[Defines.specMap] = true;
            }

            var displMap = parameters.displMap;
            var displFactor = parameters.displFactor;

            if (displMap != null || displFactor != null) {
                DisplacementMaterial.call(material);
                material.displMap = displMap;
                material.displFactor = displFactor;                
                defines[Defines.displacementMap] = true;
            }
                                    
            if (parameters.uniformScale) {
                defines[Defines.uniformScale] = true;
                properties.uniformScale = { value: true };
            }

            if (parameters.noWorldTransform) {
                defines[Defines.noWorldTransform] = true;
                properties.noWorldTransform = { value: true };
            }

            if (parameters.noViewTransform) {
                defines[Defines.noViewTransform] = true;
                properties.noViewTransform = { value: true };
            }

            if (parameters.noProjection) {
                defines[Defines.noProjection] = true;
                properties.noProjection = { value: true };
            }
                        
            var textCoordTransform = parameters.textCoordTransform;
            if (textCoordTransform != null) {
                TextureTransformMaterial.call(material);
                material.textCoordTransform = textCoordTransform;
                defines[Defines.textCoordsTransform] = true;
            }

            var reflect = parameters.reflect;
            var envMap = parameters.envMap;
            var envMapMultiply = parameters.envMapMultiply;
            var envMapAdd = parameters.envMapAdd;

            if (reflect != null || envMap != null || envMapMultiply != null || envMapAdd != null) {
                ReflectiveMaterial.call(material);
                material.reflect = reflect;
                material.envMap = envMap;
                defines[Defines.envMap] = true;
                if (envMapMultiply) {                    
                    defines[Defines.envMapMultiply] = true;
                    properties.envMapMultiply = { value: true };
                } else if (envMapAdd) {
                    defines[Defines.envMapAdd] = true;
                    properties.envMapAdd = { value: true };                    
                }
            }
            
            if (parameters.receiveLight) {
                LitMaterial.call(material);
                material.ambient = parameters.ambient;
                material.diffuse = parameters.diffuse;                
                material.specular = parameters.specular;

                defines[Defines.light] = true;
                properties.receiveLight = { value: true };
    
                var phong = parameters.phong;
                if (phong) {
                    defines[Defines.phong] = true;
                    properties.phong = { value: true };
                }
                                
                if( parameters.receiveShadows ) {

                    defines[Defines.shadows] = true;
                    properties.receiveShadows = { value: true };

                    if (parameters.pcf) {
                        defines[Defines.pcf] = true;
                        properties.pcf = { value: true };
                    }
                    else if (parameters.shadowLerp) {
                        defines[Defines.shadowLerp] = true;
                        properties.shadowLerp = { value: true };
                    }
                }

                if (parameters.ssaoMap) {
                    SSAOMaterial.call(material);
                    defines[Defines.ssaoMap] = true;
                    material.ssaoMap = parameters.ssaoMap;
                }

            }

            if (parameters.fog) {
                defines[Defines.fog] = true;
                properties.fog = { value: true };                
            }                

            var definesString = '';
            for (var key in defines)
                definesString += Programs.define(key, null, true);
            
            properties.defines = {
                get: function () {
                    return definesString;
                },
                set: function (v) {
                    definesString = v;
                }
            };
                        
            Object.defineProperties(material, properties);

            return material;
        }

        Object.defineProperties(Material.prototype, {

            constructor: { value: Material },

            clone: {
                value: function () {
                    var m = new Material();
                    
                    var parameters = {

                        blendState : this.blendState,
                        cullState : this.cullState,
                        depthState : this.depthState,

                        colorMap: this.colorMap,
                        color: this.color,

                        bumpMap: this.bumpMap,
                        
                        specMap : this.specMap,

                        displMap: this.displMap,
                        displFactor: this.displFactor,

                        uniformScale: this.uniformScale,
                        noWorldTransform: this.noWorldTransform,
                        noViewTransform: this.noViewTransform,
                        noProjection : this.noProjection,
                        textCoordTransform : this.textCoordTransform,

                        receiveLight: this.receiveLight,
                        phong : this.phong,
                        
                        ambient: this.ambient,
                        diffuse: this.diffuse,
                        specular: this.specular,

                        receiveShadows: this.receiveShadows,
                        shadowLerp: this.shadowLerp,
                        pcf : this.pcf,

                        ssaoMap : this.ssaoMap,

                        reflect: this.reflect,
                        envMap: this.envMap,
                        envMapMultiply: this.envMapMultiply,
                        envMapAdd : this.envMapAdd,

                        fog : this.fog
                        
                    };

                    makeMaterial(parameters, m);
                    return m;
                }
            }

        });

        function CustomMaterial() {
            Material.call(this);
            
            var vertexShaderSrc = null;
            var fragmentShaderSrc = null;                       
            var defines = '';

            Object.defineProperties(this, {

                defines : {
                    get: function () {
                        return defines;
                    },
                    set: function (v) {
                        defines = v;
                    }
                },

                vertexShaderSrc : {
                    get: function () {
                        return vertexShaderSrc;
                    },
                    set: function (v) {
                        vertexShaderSrc = v;
                    }
                },

                fragmentShaderSrc : {
                    get: function () {
                        return fragmentShaderSrc;
                    },
                    set: function (v) {
                        fragmentShaderSrc = v;
                    }
                }                
            });            
        }

        CustomMaterial.prototype = Object.create(Material.prototype);
        Object.defineProperties(CustomMaterial.prototype, {

            constructor: { value: CustomMaterial },

            clone: {
                value: function () {
                    var m = new CustomMaterial();
                    m.defines = this.defines;
                    m.vertexShaderSrc = this.vertexShaderSrc;
                    m.fragmentShaderSrc = this.fragmentShaderSrc;
                    m.blendState = this.blendState;
                    m.cullState = this.cullState;
                    m.depthState = this.depthState;
                    var programVariableDescCount = this.programVariableDescCount;
                    for (var i = 0; i < programVariableDescCount; i++)
                        m.addProgramVariableDesc(this.getProgramVariableDesc(i));
                    return m;
                }
            }

        });
        
        function DepthMaterial() {
            CustomMaterial.call(this);                                
            this.vertexShaderSrc = Programs.ShaderSources.depthVertex;
            this.fragmentShaderSrc = Programs.ShaderSources.depthFragment;            
        }
        DepthMaterial.prototype = Object.create(CustomMaterial.prototype);
        
        function PostEffectMaterial() {
            CustomMaterial.call(this);
            this.vertexShaderSrc = Programs.ShaderSources.postEffectVertex;
            SimpleVariable.call(this, Names.frameRendered, 'frameRendered');
        }
        PostEffectMaterial.prototype = Object.create(CustomMaterial.prototype);

        function SkyBoxMaterial() {
            CustomMaterial.call(this);
            this.vertexShaderSrc = Programs.ShaderSources.skyBoxVertex;
            this.fragmentShaderSrc = Programs.ShaderSources.skyBoxFragment;
            this.cullState = States.CullState.FRONT;
            this.depthState = States.DepthState.LESS_EQUAL;
            SimpleVariable.call(this, Names.skyBox, 'skyBox');
        }
        
        return Object.freeze({

            Material: Material,

            makeMaterial: function (parameters) {
                return makeMaterial(parameters, null);
            },
                    
            CustomMaterial: CustomMaterial,

            DepthMaterial: DepthMaterial,
            PostEffectMaterial: PostEffectMaterial,
            SkyBoxMaterial : SkyBoxMaterial,
            
            ProgramVariableDesc: ProgramVariableDesc,
            SimpleVariable : SimpleVariable
        });
    });