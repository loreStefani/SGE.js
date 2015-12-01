define(['core/Shaders', './GeometryGenerator', './RendererVariables', './Programs', './Materials', 'Utils'], function (Shaders, GeometryGenerator, RendererVariables, Programs, Materials, Utils) {

    function ResourceManager(dev) {

        var state = {
            device : dev,
            referencesCount: {},
            vertexShaders: new Utils.SortedArray(),
            fragmentShaders: new Utils.SortedArray(),
            programs: new Utils.SortedArray(),
            programsDesc: {},
            postEffectGeometry: null,
            skyBoxGeometry: null,
            skyBoxMaterial : null,
            materials: {},
            litMaterials: {}
        };

        Object.defineProperties(this, {
                        
            initMat: {
                value: function (material, renderSystemState) {
                    return initMat(material, renderSystemState, state);
                }
            },

            destroyMat : {
                value: function (material) {
                    return destroyMat(material, state);
                }
            },

            refreshLitMaterials: {
                value: function (renderSystemState) {
                    refreshLitMaterials(renderSystemState, state);
                }
            },

            getPostEffectGeometry: {
                value: function () {
                    var geom = state.postEffectGeometry;
                    if (geom == null) 
                        geom = (state.postEffectGeometry = GeometryGenerator.quadGeometry(true, false, false));
                    addReference(geom, state);
                    return geom;                    
                }
            },

            destroyPostEffectGeometry: {
                value: function () {
                    var geom = state.postEffectGeometry;
                    var release = removeReference(geom, state) == 0;
                    if (!release)
                        return;
                    geom.release();
                    state.postEffectGeometry = null;
                }
            },

            getSkyBoxGeometry: {
                value: function () {
                    var geom = state.skyBoxGeometry;
                    if (geom == null)
                        geom = (state.skyBoxGeometry = GeometryGenerator.sphereGeometry(1.0, 10, 10, true, false, false));
                    addReference(geom, state);
                    return geom;
                }
            },

            destroySkyBoxGeometry: {
                value: function () {
                    var geom = state.skyBoxGeometry;
                    var release = removeReference(geom, state) == 0;
                    if (!release)
                        return;
                    geom.release();
                    state.skyBoxGeometry = null;
                }
            },

            getSkyBoxMaterial: {
                value: function (renderSystemState) {
                    var mat = state.skyBoxMaterial;
                    if (mat == null) 
                        mat = (state.skyBoxMaterial = new Materials.SkyBoxMaterial());                    
                    return mat;
                }
            },

            destroySkyBoxMaterial: {
                value: function () {                    
                    var mat = state.skyBoxMaterial;
                    if (mat != null && state.referencesCount[mat.ID] == null)                         
                        state.skyBoxMaterial = null;                    
                }
            }           

        });
    }

    ResourceManager.prototype = {};
    Object.defineProperty(ResourceManager.prototype, 'constructor', { value: ResourceManager });

    function addReference(res, state) {
        var referencesCount = state.referencesCount;
        var resID = res.ID;        
        var count = referencesCount[resID];
        if (count != null)
            referencesCount[resID] = count + 1;
        else
            referencesCount[resID] = 1;
    }

    function removeReference(res, state) {
        var referencesCount = state.referencesCount;
        var resID = res.ID;        
        var count = referencesCount[resID];
        if (count == null)
            return;
        count--;
        if (count == 0)
            referencesCount[resID] = null;
        else
            referencesCount[resID] = count;
        return count;
    }

    function getShader(type, src, shaders, state) {
        var shadersCount = shaders.length;
        var shader;
        for (var i = 0 ; i < shadersCount; i++) {
            shader = shaders.get(i);
            if (shader.source === src) {
                addReference(shader, state);
                return shader;
            }
        }
        shader = Shaders.createShader(type, src);
        shaders.insert(shader);
        addReference(shader, state);
        return shader;
    }

    function releaseShader(shader, shaders, state) {

        var release = removeReference(shader, state) == 0;
        if (!release)
            return;
                
        shaders.remove(shader);
        shader.release();
    }

    function getVertexShader(src, state) {
        return getShader(Shaders.ShaderType.VERTEX_SHADER, src, state.vertexShaders, state);
    }

    function getFragmentShader(src, state) {
        return getShader(Shaders.ShaderType.FRAGMENT_SHADER, src, state.fragmentShaders, state);
    }

    function initProgram(vertexShader, fragmentShader, rendererVariables, state) {

        var programs = state.programs;
        var programsCount = programs.length;
        var program;
        for (var i = 0; i < programsCount; i++) {
            program = programs.get(i);
            if (program.vertexShader == vertexShader && program.fragmentShader == fragmentShader) {
                addReference(program, state);
                return state.programsDesc[program.ID];
            }
        }

        program = Shaders.createProgram(vertexShader, fragmentShader);
        var programVariables = state.device.getProgramVariables(program);
        var rendererVariables = findRendererVariables(programVariables, rendererVariables);
        var desc = {
            program: program,
            currMaterial : null,
            programVariables: programVariables,
            rendererVariables: rendererVariables,
            sceneVariables: rendererVariables.sceneVariables,
            cameraVariables: rendererVariables.cameraVariables,
            needsUpdate: true
        };
        state.programsDesc[program.ID] = desc;

        programs.insert(program);
        addReference(program, state);
        return desc;
    }
    
    //keeping a list of materials which use the program is not necessary
    //because a program can be released only releasing one of such materials
    function releaseProgram(program, state) {        
        var programID = program.ID;
        var programs = state.programs;
        var programDesc = state.programsDesc[programID];
        if (programDesc == null)
            return;
                
        var release = removeReference(program, state) == 0;
        if (!release)
            return;
                        
        programs.remove(program);
        state.programsDesc[programID] = null;

        releaseShader(program.vertexShader, state.vertexShaders, state);
        releaseShader(program.fragmentShader, state.fragmentShaders, state);

        releaseRendererVariables(programDesc.rendererVariables);
        program.release();                
    }

    function findRendererVariables(variables, rendererVariables) {

        var foundVariables = {};

        for (var variableUse in rendererVariables) {
                        
            var perUseVariables = rendererVariables[variableUse];
            var foundPerUse = (foundVariables[variableUse] = []);
            
            for (var rendererVariable in perUseVariables) {

                var programVariable = variables[rendererVariable];
                if (programVariable != null) {
                    var desc = perUseVariables[rendererVariable];
                    var rendererVar = new desc.ctor(programVariable);
                    var global = desc.global;
                    if (global != null)
                        global.addVariable(rendererVar);
                    foundPerUse.push(rendererVar);
                }
            }
        }

        return foundVariables;
    }

    function releaseRendererVariables(rendererVariables) {

        for (var key in rendererVariables) {

            var perUseVariables = rendererVariables[key];            
            var count = perUseVariables.length;
            for (var i = 0 ; i < count; i++) 
                perUseVariables[i].releaseFun();
        }
    }
        
    function initMat(material, renderSystemState, state){
        
        var materials = state.materials;
        var materialID = material.ID;

        var materialDesc = materials[materialID];
        if (materialDesc != null) {
            addReference(material, state);
            return null;
        }

        var programDesc = getMaterialProgramDesc(material, renderSystemState, state);
                
        var materialDesc = {};

        initMaterialDesc(material, materialDesc, programDesc);

        materials[materialID] = materialDesc;
        if (material.receiveLight)
            state.litMaterials[materialID] = materialDesc;
        
        addReference(material, state);
        return materialDesc;
    }

    function getMaterialProgramDesc(material, renderSystemState, state) {

        var defines = initDefines(material, renderSystemState) + material.defines;

        var vertexShaderSrc = defines + material.vertexShaderSrc;
        var fragmentShaderSrc = defines + material.fragmentShaderSrc;

        var vertexShader = getVertexShader(vertexShaderSrc, state);
        var fragmentShader = getFragmentShader(fragmentShaderSrc, state);
        return initProgram(vertexShader, fragmentShader, renderSystemState.rendererVariables, state);
    }
    
    function initMaterialDesc(material, materialDesc, programDesc) {
        materialDesc.material = material;
        materialDesc.programDesc = programDesc;        
        materialDesc.objectVariables = programDesc.rendererVariables.objectVariables;
        var customVariables = [];
        materialDesc.customVariables = customVariables;
        initMaterialVariables(material, customVariables, programDesc.programVariables);
    }

    function initMaterialVariables(material, materialVariables, programVariables) {
        var count = material.programVariableDescCount;

        for (var i = 0; i < count; i++) {

            var variableDesc = material.getProgramVariableDesc(i);

            var programVariable = programVariables[variableDesc.shaderName];
            if (programVariable == null)
                continue;

            if (variableDesc.setFun == null)
                continue;
            var customVariable = new RendererVariables.CustomVariable(programVariable, variableDesc);
            //init value
            customVariable.setFun();
            materialVariables.push(customVariable);
        }
    }
    
    function destroyMat(material, state) {
        var release = removeReference(material, state) == 0;
        if (!release)
            return false;

        var materials = state.materials;
        var materialID = material.ID;
        var materialDesc = materials[materialID];
        var programDesc = materialDesc.programDesc;
        releaseProgram(programDesc.program, state);
        materials[materialID] = null;
        if (material.receiveLight)
            state.litMaterials[materialID] = null;
        return true;
    }
    
    function initDefines(material, state) {

        var ProgramsUtils = Programs;
        var builtInDefines = ProgramsUtils.Defines;
        var define = ProgramsUtils.define;

        var defines = '';
                
        if (material.receiveLight) {                      
                                                
            defines += define(builtInDefines.dirLightsCount, state.dirLights.length, true);
            defines += define(builtInDefines.spotLightsCount, state.spotLights.length, true);
            defines += define(builtInDefines.pointLightsCount, state.pointLights.length, true);

            defines += define(builtInDefines.shadowDirLightsCount, state.shadowDirLights.length, true);
            defines += define(builtInDefines.shadowSpotLightsCount, state.shadowSpotLights.length, true);
            defines += define(builtInDefines.shadowPointLightsCount, state.shadowPointLights.length, true);
        }
                
        return defines;
    }

    function refreshLitMaterials(renderSystemState, state) {

        var litMaterials = state.litMaterials;
        var litMaterialDesc;    
        
        for (var key in litMaterials) {
            litMaterialDesc = litMaterials[key];
            if (litMaterialDesc == null)
                continue;
            var programDesc = litMaterialDesc.programDesc;            
            releaseProgram(programDesc.program, state);
        }

        for (var key in litMaterials) {
            litMaterialDesc = litMaterials[key];
            if (litMaterialDesc == null)
                continue;
            var material = litMaterialDesc.material;
            var programDesc = getMaterialProgramDesc(material, renderSystemState, state);
            initMaterialDesc(material, litMaterialDesc, programDesc);
        }
    }
    

    return ResourceManager;
});