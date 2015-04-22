define(function () {
        
    'use strict';

    //glsl utils

    function newLineReq(nl) {
        if (nl != null && nl)
            return '\n';
        else
            return '';
    }

    function ifDef(def, line, nl) {        
        return '#ifdef ' + def + '\n' + line + '\n' + '#endif' + newLineReq(nl);
    }

    function ifnDef(def, line, nl) {
        return '#ifndef ' + def + '\n' + line + '\n' + '#endif' + newLineReq(nl);
    }

    function ifCond(condition, line, nl) {
        return '#if ' + condition + '\n' + line + '\n' + '#endif' + newLineReq(nl);
    }

    function definedCond(def, nl) {
        return 'defined(' + def + ')' + newLineReq(nl);
    }

    function define(define, value, nl) {
        if (value == null)
            value = '';
        else
            value = ' ' + value;

        return '#define ' + define + value + newLineReq(nl);
    }

    function undefine(define, nl){
        return '#undef ' + define + newLineReq(nl);
    }

    var uniformQf = 'uniform';
    var varyingQf = 'varying';
    var attrQf = 'attribute';

    function declare(qualifier, type, name, nl) {
        if (nl != null && nl)
            nl = '\n';
        else
            nl = '';
        return qualifier + ' ' + type + ' ' + name + ';' + nl;
    }

    function declareArray(qualifier, type, name, size, nl) {
        return declare(qualifier, type, name + '[' + size + ']', nl);
    }

    function declareUniform(type, name, nl) {
        return declare(uniformQf, type, name, nl);
    }

    function declareUniformArray(type, name, size, nl) {
        return declareArray(uniformQf, type, name, size, nl);
    }    

    function declareVarying(type, name, nl) {
        return declare(varyingQf, type, name, nl);
    }

    function declareVaryingArray(type, name, size, nl) {
        return declareArray(varyingQf, type, name, size, nl);
    }

    function declareAttribute(type, name, nl) {
        return declare(attrQf, type, name, nl);
    }

    function joinObj(obj) {

        for (var key in obj) {

            var a = obj[key];
            if (!(a instanceof Array))
                obj[key] = a + '\n';
            else if (a.length == 1)
                obj[key] = a[0] + '\n';
            else
                obj[key] = a.join('\n') + '\n';

        }

        return obj;
    }

    var Defines = {
        
        normals: 'NORMALS',
        textCoords: 'TEXTCOORDS',
        tangents: 'TANGENTS',

        uniformScale: 'UNIFORM_SCALE',
        noWorldTransform: 'WORLD_SPACE_INPUT',
        noViewTransform: 'WORLD_SPACE_IS_VIEW_SPACE',
        noProjection : 'NO_PROJECTION',
        textCoordsTransform: 'TEXTCOORDS_TRANSFORM',

        eyePos: 'EYE_POS',
        fog: 'FOG',

        phong: 'PHONG',
              
        color: 'COLOR',
        colorMap: 'COLOR_MAP',

        specMap: 'SPEC_MAP',

        envMap: 'ENV_MAP',        
        envMapMultiply: 'ENV_MAP_MULTIPLY',
        envMapAdd : 'ENV_MAP_ADD',

        bumpMap: 'BUMP_MAP',
        displacementMap: 'DISPL_MAP',

        ssaoMap : 'SSAO_MAP',
        
        light: 'LIGHT',
        shadows : 'SHADOWS',

        dirLights : 'DIR_LIGHTS',
        dirLightsCount: 'DIR_LIGHT_COUNT',

        spotLights : 'SPOT_LIGHTS',
        spotLightsCount: 'SPOT_LIGHT_COUNT',

        pointLights : 'POINT_LIGHTS',
        pointLightsCount: 'POINT_LIGHT_COUNT',

        pointLightShadowMap : 'POINT_LIGHT',

        shadowDirLights : 'DIR_SHADOW_LIGHTS',
        shadowDirLightsCount: 'DIR_SHADOW_LIGHT_COUNT',

        shadowSpotLights : 'SPOT_SHADOW_LIGHTS',
        shadowSpotLightsCount: 'SPOT_SHADOW_LIGHT_COUNT',

        shadowPointLights : 'POINT_SHADOW_LIGHTS',
        shadowPointLightsCount: 'POINT_SHADOW_LIGHT_COUNT',

        pcf: 'SHADOW_PCF',
        shadowLerp : 'SHADOW_LERP',

        lightSource : 'LIGHT_SOURCE',

        skinned: 'SKINNED',
        bonesCount: 'BONES_COUNT',
        influencesPerVertex : 'INFLUENCES_PER_VERTEX',
        
        dependencies : {
            common : '',
            vertexShader : '',
            fragmentShader : ''
        }
    };
    
    Defines.dependencies.common =
        ifnDef(
            Defines.dirLightsCount,
            define(Defines.dirLightsCount, 0), true) +

        ifnDef(
            Defines.spotLightsCount,
            define(Defines.spotLightsCount, 0), true) +

        ifnDef(
            Defines.pointLightsCount,
            define(Defines.pointLightsCount, 0), true) +

        ifnDef(
            Defines.shadowDirLightsCount,
            define(Defines.shadowDirLightsCount, 0), true) +

        ifnDef(
            Defines.shadowSpotLightsCount,
            define(Defines.shadowSpotLightsCount, 0), true) +

        ifnDef(
            Defines.shadowPointLightsCount,
            define(Defines.shadowPointLightsCount, 0), true) +

        ifCond(
            Defines.dirLightsCount + ' > 0',
            define(Defines.dirLights), true) +

        ifCond(
            Defines.spotLightsCount + ' > 0',
            define(Defines.spotLights), true) +

        ifCond(
            Defines.pointLightsCount + ' > 0',
            define(Defines.pointLights), true) +

        ifCond(
            Defines.shadowDirLightsCount + ' > 0',
            define(Defines.shadowDirLights), true) +

        ifCond(
            Defines.shadowSpotLightsCount + ' > 0',
            define(Defines.shadowSpotLights), true) +

        ifCond(
            Defines.shadowPointLightsCount + ' > 0',
            define(Defines.shadowPointLights), true) +

        ifCond(
            definedCond(Defines.dirLights) + ' || ' +
            definedCond(Defines.spotLights) + ' || ' +
            definedCond(Defines.pointLights) + ' || ' +

            definedCond(Defines.shadowDirLights) + ' || ' +
            definedCond(Defines.shadowSpotLights) + ' || ' +
            definedCond(Defines.shadowPointLights),

            define(Defines.lightSource, null, true) +
            define(Defines.light, null, true) + 
            define(Defines.normals, null, true) +
            define(Defines.eyePos), true) + 

        ifDef(
            Defines.textCoordsTransform,
            define(Defines.textCoords), true) +

        ifDef(
            Defines.bumpMap,
            define(Defines.textCoords, null, true) +
            define(Defines.normals, null, true) +
            define(Defines.tangents), true) +

        ifDef(
            Defines.colorMap,
            define(Defines.textCoords, null, true) +
            undefine(Defines.color), true) +

        ifCond(
            definedCond(Defines.lightSource) + ' && ' +
            definedCond(Defines.specMap),            
            define(Defines.textCoords), true) +

        ifDef(
            Defines.envMap,
            define(Defines.normals, null, true) +
            define(Defines.eyePos), true) + 
        
        ifCond(
            definedCond(Defines.ssaoMap) + ' && !' +
            definedCond(Defines.light),
            undefine(Defines.ssaoMap), true);

    Defines.dependencies.vertexShader =

        ifCond(
            definedCond(Defines.uniformScale) + ' && !' + definedCond(Defines.normals),
            undefine(Defines.uniformScale), true ) + 

        ifDef(
            Defines.displacementMap,
            define(Defines.textCoords, null, true) +
            define(Defines.normals), true) +
                    
        ifnDef(
            Defines.bonesCount,
            define(Defines.bonesCount, 0), true) +

        ifnDef(
            Defines.influencesPerVertex,
            define(Defines.influencesPerVertex, 0), true) +

        ifCond(
            Defines.bonesCount + ' > 0 && ' + Defines.influencesPerVertex + ' > 0',
            define(Defines.skinned), true);

    Defines.dependencies.fragmentShader =
        ifDef(
            Defines.fog,
            define(Defines.eyePos), true);        

    var Names = {

        attributes: {
            position: 'a_position',
            normal: 'a_normal',
            textCoord: 'a_textCoord',
            tangent: 'a_tangent',
            skinWeight: 'a_skinWeights',
            skinIndex: 'a_skinIndices'
        },

        varyings: {
            worldPosition: 'v_position',
            clipPosition : 'v_positionClip',
            worldNormal: 'v_normal',
            textCoord: 'v_textCoord',
            worldTangent: 'v_tangent',
            dirShadowPositions: 'v_dirShadowPosition',
            spotShadowPositions: 'v_spotShadowPosition'
        },

        uniforms: {
            projectionView: 'u_projView',
            projection: 'u_projection',
            viewTransform: 'u_view',
            worldTransform: 'u_world',
            worldInvTranspose: 'u_worldInvTranspose',
            projectionViewWorld: 'u_projViewWorld',
            bonesTransforms: 'u_bonesTransforms',
            bonesInvTransposes: 'u_bonesInvTransposes',

            directionalLights: 'u_directionalLights',
            spotLights: 'u_spotLights',
            pointLights: 'u_pointLights',

            shadowDirectionalLights: 'u_directionalLightShadowCasters',
            shadowSpotLights: 'u_spotLightShadowCasters',
            shadowPointLights: 'u_pointLightShadowCasters',

            dirShadowTransforms: 'u_dirShadowTransforms',
            dirShadowMaps: 'u_dirShadowMaps',
            dirShadowMapSizeAndBias: 'u_dirShadowMapSizeAndBias',

            spotShadowTransforms: 'u_spotShadowTransforms',
            spotShadowMaps: 'u_spotShadowMaps',
            spotShadowMapSizeAndBias: 'u_spotShadowMapSizeAndBias',

            pointShadowMaps: 'u_pointShadowMaps',
            pointPositionAndBiases: 'u_pointPositionAndBiases',

            invSquaredSceneSize: 'u_invSquaredSceneSize',

            textCoordTransform: 'u_textCoordTransform',

            displacementMap: 'u_displMap',
            displacementFactor: 'u_displFactor',

            materialAmbient: 'u_matAmbient',
            materialDiffuse: 'u_matDiffuse',
            materialSpecular: 'u_matSpecular',
            materialReflect: 'u_matReflect',

            ambientLight: 'u_ambientLight',

            ssaoMap:'u_ssaoMap',

            colorMap: 'u_colorMap',
            bumpMap: 'u_bumpMap',
            environmentMap: 'u_envMap',
            specularMap: 'u_specMap',
            color: 'u_color',
            eyePosition: 'u_eyePosition',
            fogColor: 'u_fogColor',
            fogStartDistanceAndRange: 'u_fogStartDistanceAndRange',

            skyBox: 'u_skyBox',
            frameRendered: 'u_frameRendered'
        }
    };

    var customTypes = joinObj({

        directionalLight: [

            'struct DirectionalLight{',
                'vec4 color;',
                'vec3 direction;',
            '};'
        ],

        spotLight: [
            'struct SpotLight{',
                'vec4 color;',
                'vec4 attenuationAndSpot;',
                'vec3 direction;',
                'vec3 position;',                
            '};'
        ],

        pointLight: [
            'struct PointLight{',
                'vec4 color;',
                'vec4 positionAndRange;',
                'vec3 attenuation;',
            '};'
        ]

    });

    var functions = joinObj({
        
        diffuseFactor: 
            ifDef(
                Defines.lightSource,
                [                    
                    'float calcDiffFactor(vec3 toLight, vec3 normal){',
                        /*
                        * Lambert's law
                        * toLight and normal are normalized => dot(toLight, normal) == cos(theta), 
                        * with theta = angle between toLight and normal.
                        * theta is clamped to [0,PI/2] to avoid lighting if the light source is placed behind the surface
                        */
                        'return max(dot(toLight,normal),0.0);',
                    '}',

                ].join('\n')),            

        specularFactor:
            ifDef(
                Defines.lightSource,
                [
                    'float calcSpecFactor(vec3 lightDir, vec3 normal, vec3 toEye){',
                        
                        ifDef(
                            Defines.phong,
                            [
                                //Fresnel's law
                                'vec3 reflVector = reflect(lightDir,normal);',
                                'float cosTheta = dot(reflVector, toEye);',

                                '#else',

                                //Blinn-Phong halfway vector
                                'vec3 halfWayVector = normalize(-lightDir + toEye);',
                                'float cosTheta = dot(normal, halfWayVector);',


                            ].join('\n')),                            
                        
                        /*
                        * same considerations done for diffuseFactor (theta clamped to [0,PI/2]) plus 
                        * specular exponent elevation
                        */
                        'return pow(max(cosTheta, 0.0), ' + Names.uniforms.materialSpecular +'.w );',
                    '}'
                ].join('\n')),

        directionalLights: [

                '#if defined(' + Defines.dirLights + ') || defined(' + Defines.shadowDirLights + ')',
                                    
                    customTypes.directionalLight,

                    'void ComputeDirectionalLight( const DirectionalLight l, const vec3 normal, const vec3 toEye, ',
                                                   'out vec4 diffuse, out vec4 specular ){',

                        'vec3 lightDir = l.direction;',
                        'vec4 lightColor = l.color;',                                                                     
                        'float diffFact = calcDiffFactor(-lightDir, normal);',
                        'diffuse = diffFact * lightColor;',
                                                
                        'float specFact = calcSpecFactor(lightDir, normal, toEye);',
                        'specular = specFact * lightColor;',

                    '}',

                '#endif'
        ],

        spotLights: [

                '#if defined(' + Defines.spotLights + ') || defined(' + Defines.shadowSpotLights + ')',                    
                                    
                    customTypes.spotLight,

                    'void ComputeSpotLight( const SpotLight l, const vec3 position, const vec3 normal, const vec3 toEye, ',
                                            'out vec4 diffuse, out vec4 specular ){',
                                                                    
                        'vec3 toLight = l.position - position;',
                        'float distance = length(toLight);',
                        //normalize using computed distance
                        'toLight /= distance;',
                        
                        'vec4 lightColor = l.color;',
                        'float diffFact = calcDiffFactor(toLight, normal);',
                        'diffuse = diffFact * lightColor;',
                                                   
                        'vec3 lightDir = -toLight;',
                        'float specFact = calcSpecFactor(lightDir, normal, toEye);',
                        'specular = specFact * lightColor;',                                              
                        
                        'vec4 attenuationAndSpot = l.attenuationAndSpot;',

                        // clamp surface positions inside the light cone                        
                        'float spot =  pow( max(dot(lightDir, l.direction), 0.0) , attenuationAndSpot.w);',
                        
                        'float attFact = min(1.0 / dot(attenuationAndSpot.xyz,vec3(1.0,distance,distance*distance)), 1.0);',

                        'attFact *= spot;',
                        'diffuse *= attFact;',
                        'specular *= attFact;',
                    '}',
                '#endif'
        ],

        pointLights: [

                '#if defined(' + Defines.pointLights + ') || defined(' + Defines.shadowPointLights + ')',
                    
                    customTypes.pointLight,

                    'void ComputePointLight( const PointLight l, const vec3 position, const vec3 normal, const vec3 toEye, ',
                                            'out vec4 diffuse, out vec4 specular ){',
                        
                        'vec3 toLight = l.positionAndRange.xyz - position;',
                        'float distance = length(toLight);',                        
                        'toLight /= distance;',

                        'vec4 lightColor = l.color;',
                        'float diffFact = calcDiffFactor(toLight, normal);',
                        'diffuse = diffFact * lightColor;',
                        
                        'float specFact = calcSpecFactor(-toLight, normal, toEye);',
                        'specular = specFact * lightColor;',

                        'float rangeFactor = 1.0 - float(l.positionAndRange.w < distance);', 
                        'float attFact = min(1.0 / dot(l.attenuation,vec3(1.0,distance,distance*distance)), 1.0);',

                        'attFact *= rangeFactor;',
                        'diffuse *= attFact;',
                        'specular *= attFact;',
                    '}',

                '#endif'
        ],
        
        /*
        * See http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
        */
        packShadows: [

            'vec4 pack(float depth){',
                'const vec4 bias = vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);',
                'float r = depth;',
                'float g = fract(r * 255.0);',
                'float b = fract(g * 255.0);',
                'float a = fract(b * 255.0);',
                'vec4 color = vec4(r, g, b, a);',
                'return color - (color.yzww * bias);',
            '}'
        ],

        unpackShadows: [

            'float unpack(vec4 rgbaDepth){',
                'const vec4 bitShifts = vec4(1.0, 1.0 / 255.0, 1.0 / (255.0 * 255.0), 1.0 / (255.0 * 255.0 * 255.0));',
                'return dot(rgbaDepth, bitShifts);',
            '}',            
        ],

        bumpSampleProc: [
                        
            'vec3 normalSampleToWorldSpace(vec3 normalMapSample, vec3 normal, vec3 tangent){',
                //normalMapSample's components are compressed in the inteval [0,1], so uncompressed it to [-1, 1]                
                'normalMapSample = 2.0 * normalMapSample - vec3(1.0,1.0,1.0);',
                //ensure tangent and normal are orthonormal substracting from tangent any component along the direction of normal
                'tangent = normalize( tangent - dot(tangent,normal)*normal);',                
                'vec3 bitangent = cross(normal,tangent);',
                'mat3 TBN = mat3(tangent, bitangent, normal);',
                //convert tangent space normal to world space
                'return TBN*normalMapSample;',                
            '}'
        ]
    });

    functions.shadows = [

            '#ifdef ' + Defines.shadows,

                functions.unpackShadows,
                
                '#if defined(' + Defines.shadowDirLights + ') || defined(' + Defines.shadowSpotLights + ')',                                        
                    
                    /*
                    * Soft shadows implementation adapted from : 
                    * http://codeflow.org/entries/2013/feb/15/soft-shadow-mapping/
                    */

                    'float texture2DCompare(sampler2D shadowMap, vec2 uv, float compare){',
                        'float depth = unpack(texture2D(shadowMap, uv));',
                        'return step(compare, depth);',
                    '}',
                          
                    '#if defined(' + Defines.shadowLerp + ') || defined(' + Defines.pcf + ')',

                        'float texture2DShadowLerp(sampler2D shadowMap, vec2 shadowMapSize, vec2 texelSize, vec2 shadowMapCoord, float compare){',                            
                            
                            'vec2 roundTexel = shadowMapCoord*shadowMapSize+0.5;',
                            'vec2 centroid = floor(roundTexel)/shadowMapSize;',

                            'float lb = texture2DCompare(shadowMap, centroid, compare);',
                            'float lt = texture2DCompare(shadowMap, vec2(centroid.x, centroid.y + texelSize.y), compare);',
                            'float rb = texture2DCompare(shadowMap, vec2(centroid.x +texelSize.x, centroid.y), compare);',
                            'float rt = texture2DCompare(shadowMap, centroid+texelSize, compare);',
                            
                            'vec2 t = fract(roundTexel);',
                            'float a = mix(lb, lt, t.y);',
                            'float b = mix(rb, rt, t.y);',
                            'float c = mix(a, b, t.x);',
                            'return c;',
                        '}',

                    '#endif',

                    '#ifdef ' + Defines.pcf,

                        'float PCF(sampler2D shadowMap, vec2 shadowMapSize, vec2 texelSize, vec2 shadowMapCoord, float compare){',
                            'float result = 0.0;',
                            'for(int x=-1; x<=1; x++){',
                                'for(int y=-1; y<=1; y++){',
                                    'vec2 off = vec2(x,y)*texelSize;',
                                    'result += texture2DShadowLerp(shadowMap, shadowMapSize, texelSize, shadowMapCoord+off, compare);',
                                '}',
                            '}',
                            'return result/9.0;',
                        '}',

                    '#endif',

                    'float calcShadowFactor(sampler2D shadowMap, float depth, vec2 shadowMapCoord, vec2 shadowMapSize){',                        
                        '#ifdef ' + Defines.pcf,
                            'vec2 texelSize = vec2(1.0)/shadowMapSize;',
                            'return PCF(shadowMap, shadowMapSize, texelSize, shadowMapCoord, depth);',
                        '#elif defined(' + Defines.shadowLerp + ')',
                            'vec2 texelSize = vec2(1.0)/shadowMapSize;',
                            'return texture2DShadowLerp(shadowMap, shadowMapSize, texelSize, shadowMapCoord, depth);',
                        '#else',
                            'return texture2DCompare(shadowMap, shadowMapCoord, depth);',
                        '#endif',
                    '}',

                '#endif',

                '#ifdef ' +  Defines.shadowPointLights,
                    
                    'float calcShadowFactor(samplerCube shadowMap, float shadowBias, vec3 shadowMapCoord){',
                        'float smpl = unpack(textureCube(shadowMap, shadowMapCoord ));',
                        'float depth = dot(shadowMapCoord,shadowMapCoord) * ' + Names.uniforms.invSquaredSceneSize + '+ shadowBias;',
                        'return float( depth <= smpl );',
                    '}',
                '#endif',

            '#endif'
    ].join('\n') + '\n';
            
        
    var ShadersParams = (function () {
        
        var names = Names.uniforms;

        return {

            varyings: (function () {               

                var names = Names.varyings;

                return joinObj({

                    worldPosition: declareVarying('vec3', names.worldPosition),

                    clipPosition : ifDef(Defines.ssaoMap, declareVarying('vec4', names.clipPosition) ),

                    worldNormal: ifDef( Defines.normals, declareVarying('vec3', names.worldNormal) ),

                    textCoord: ifDef( Defines.textCoords, declareVarying('vec2', names.textCoord) ),

                    worldTangent: ifDef( Defines.tangents, declareVarying('vec3', names.worldTangent)),

                    dirShadowPositions: 
                        ifDef( 
                            Defines.shadowDirLights,
                            declareVaryingArray('vec4', names.dirShadowPositions, Defines.shadowDirLightsCount) ),
                    
                    spotShadowPositions: 
                        ifDef(
                            Defines.shadowSpotLights,
                            declareVaryingArray('vec4', names.spotShadowPositions, Defines.shadowSpotLightsCount) )
                            
                });

            })(),

            vertexShader: {

                attributes: (function () {
                    
                    var names = Names.attributes;

                    return joinObj({

                        position: declareAttribute('vec3', names.position),

                        normal: ifDef(Defines.normals, declareAttribute('vec3', names.normal)),

                        textCoord: ifDef(Defines.textCoords, declareAttribute('vec2', names.textCoord)),

                        tangent: ifDef(Defines.tangents, declareAttribute('vec3', names.tangent)),

                        skin:
                            ifDef(
                                Defines.skinned,
                                declareAttribute('vec4', names.skinWeight, true) +
                                declareAttribute('vec4', names.skinIndex) )
                    });

                })(),

                uniforms: joinObj({

                    viewTransform : 
                        ifCond(
                            definedCond(Defines.noProjection) + ' && !'+ definedCond(Defines.noViewTransform),
                            declareUniform('mat4', names.viewTransform)),

                    projection:
                        ifnDef(
                            Defines.noProjection,
                            ifDef(
                                Defines.noViewTransform,
                                [
                                    declareUniform('mat4', names.projection),
                                    '#else',
                                    declareUniform('mat4', names.projectionView)
                                ].join('\n'))
                        ),
                    
                    worldTransform:
                        ifnDef(Defines.noWorldTransform,
                        declareUniform('mat4', names.worldTransform)),

                    worldInvTranspose: 
                        ifCond(
                            definedCond(Defines.normals) + ' && !' + definedCond(Defines.uniformScale) + ' && !' + definedCond(Defines.noWorldTransform),
                            declareUniform('mat3', names.worldInvTranspose)),

                    shadowDirectionalLights: 
                        ifDef(
                            Defines.shadowDirLights,
                            declareUniformArray('mat4', names.dirShadowTransforms, Defines.shadowDirLightsCount) ),

                    shadowSpotLights:
                        ifDef(
                            Defines.shadowSpotLights,
                            declareUniformArray('mat4', names.spotShadowTransforms, Defines.shadowSpotLightsCount) ),

                    bonesTransforms: 
                        ifDef(
                            Defines.skinned,
                            declareUniformArray('mat4', names.bonesTransforms, Defines.bonesCount) ),

                    bonesInvTransposes:
                        ifCond(
                            definedCond(Defines.skinned) + ' && ' + definedCond(Defines.normals) + ' && !' + definedCond(Defines.uniformScale),                            
                            declareUniformArray('mat3', names.bonesInvTransposes, Defines.bonesCount)),

                    textCoordTransform : 
                            ifDef(
                                Defines.textCoordsTransform,
                                declareUniform('mat3', names.textCoordTransform) ),

                    displMap: 
                        ifDef(
                            Defines.displacementMap,
                            declareUniform('sampler2D', names.displacementMap, true) +
                            declareUniform('float', names.displacementFactor) )                    
                })
            },

            fragmentShader: {

                uniforms: joinObj({

                    eyePosition: 
                        ifDef(
                            Defines.eyePos, 
                            declareUniform('vec3', names.eyePosition)),

                    fog: 
                        ifDef(
                            Defines.fog,
                            declareUniform('vec4', names.fogColor, true) +
                            declareUniform('vec2', names.fogStartDistanceAndRange)),
                    
                    colorMap: 
                        ifDef(
                            Defines.colorMap,
                            declareUniform('sampler2D', names.colorMap)),

                    color:
                        ifDef(
                            Defines.color,
                            declareUniform('vec4', names.color)),

                    bumpMap: 
                        ifDef(
                            Defines.bumpMap,
                            declareUniform('sampler2D', names.bumpMap)),

                    specMap : 
                        ifDef(
                            Defines.specMap,
                            declareUniform('sampler2D', names.specularMap)),

                    litMat : 
                        ifDef(
                            Defines.lightSource,                            
                            declareUniform('vec4', names.materialDiffuse, true) +
                            declareUniform('vec4', names.materialSpecular)),

                    envMap : 
                        ifDef(
                            Defines.envMap,
                            declareUniform('samplerCube', names.environmentMap, true) +
                            declareUniform('vec4', names.materialReflect)),

                    ambientLight:
                        ifDef(
                            Defines.light,
                            declareUniform('vec4', names.materialAmbient, true) +
                            declareUniform('vec4', names.ambientLight)),

                    ssaoMap : 
                        ifDef(
                            Defines.ssaoMap,
                            declareUniform('sampler2D', names.ssaoMap)),
                    
                    directionalLights: 
                        ifDef(
                            Defines.dirLights,
                            declareUniformArray('DirectionalLight', names.directionalLights, Defines.dirLightsCount)),

                    spotLights: 
                        ifDef(
                            Defines.spotLights,
                            declareUniformArray('SpotLight', names.spotLights, Defines.spotLightsCount)),

                    pointLights: 
                        ifDef(
                            Defines.pointLights,
                            declareUniformArray('PointLight', names.pointLights, Defines.pointLightsCount)),

                    shadowDirectionalLights: 
                        ifDef(
                            Defines.shadowDirLights,
                            declareUniformArray('DirectionalLight', names.shadowDirectionalLights, Defines.shadowDirLightsCount, true) +
                            declareUniformArray('sampler2D', names.dirShadowMaps, Defines.shadowDirLightsCount, true) +
                            declareUniformArray('vec3', names.dirShadowMapSizeAndBias, Defines.shadowDirLightsCount)),

                    shadowSpotLights: 
                        ifDef(
                            Defines.shadowSpotLights,
                            declareUniformArray('SpotLight', names.shadowSpotLights, Defines.shadowSpotLightsCount, true) +
                            declareUniformArray('sampler2D', names.spotShadowMaps, Defines.shadowSpotLightsCount, true) +
                            declareUniformArray('vec3', names.spotShadowMapSizeAndBias, Defines.shadowSpotLightsCount)),

                    shadowPointLights: 
                        ifDef(
                            Defines.shadowPointLights,
                            declareUniformArray('PointLight', names.shadowPointLights, Defines.shadowPointLightsCount, true) +
                            declareUniformArray('samplerCube', names.pointShadowMaps, Defines.shadowPointLightsCount, true) +
                            declareUniformArray('vec4', names.pointPositionAndBiases, Defines.shadowPointLightsCount, true) +
                            declareUniform('float', names.invSquaredSceneSize))
                })
            }
        };
    })();

    var ShadersChunks = {

        vertexShader: joinObj({
                        
            skinning:
                ifDef(
                    Defines.skinned,
                    [
                        'vec3 localPos = vec3(0.0,0.0,0.0);',
                        'vec3 localNorm = vec3(0.0,0.0,0.0);',
                        ifDef(
                            Defines.uniformScale,
                            'vec4 tempNorm = vec4(norm, 0.0);'),                            

                        ifDef(
                            Defines.tangents,
                            'vec4 localTangent = vec4(0.0,0.0,0.0, 0.0);'),                       
                                                  
                        'for(int i = 0 ; i < ' + Defines.influencesPerVertex + '; i++){',
                            'float weight = ' + Names.attributes.skinWeight + '[i];',
                            'int index = int(' + Names.attributes.skinIndex + '[i]);',
                            'mat4 boneTransform = ' + Names.uniforms.bonesTransforms + '[index];',

                            'localPos += weight * (boneTransform * pos).xyz;',
                            ifDef(
                                Defines.normals,
                                ifnDef(
                                    Defines.uniformScale,
                                    [
                                        'localNorm += weight * (' + Names.uniforms.bonesInvTransposes + '[index] * norm);',
                                        '#else',
                                        'localNorm += weight * (boneTransform * tempNorm).xyz;',
                                    ].join('\n'))
                            ),

                            ifDef(
                                Defines.tangents,
                                'localTangent += weight * (boneTransform * tang);'),
                        '}',

                        'pos = vec4(localPos,1.0);',
                        ifDef(
                            Defines.normals,
                            'norm = localNorm;'), 
                        ifDef(
                            Defines.tangents,
                            'tang = localTangent;')

                    ].join('\n')),

            displMap: 
                ifDef(
                    Defines.displacementMap,
                    [
                        /*
                        * sample displacement map : displAmount is in the interval [0,1], it is common shifting the interval by -1 so 
                        * the geometry pops inward instead of outward.
                        * displacementFactor provides a scale for the interval which becomes [-displacementFactor, 0.0]
                        */
                        'float displAmount = texture2D(' + Names.uniforms.displacementMap + ', ' + Names.attributes.textCoord + ').r;',                        
                        'pos.xyz += ' + Names.uniforms.displacementFactor + '*(displAmount - 1.0)*norm;'

                    ].join('\n')),

            transforms: [

                ifnDef(
                    Defines.noWorldTransform,
                    [
                        'worldPos = ' + Names.uniforms.worldTransform + '* pos;',
                        '#else',
                        'worldPos = pos;',

                    ].join('\n')),                
                
                Names.varyings.worldPosition + ' = worldPos.xyz;',

                ifDef(
                    Defines.normals,
                    
                    ifnDef(
                        Defines.noWorldTransform,
                        [
                            ifDef(
                                Defines.uniformScale,
                                [
                                    Names.varyings.worldNormal + ' = (' + Names.uniforms.worldTransform + '* vec4(norm,0.0)).xyz;',
                                    '#else',
                                    Names.varyings.worldNormal + ' = ' + Names.uniforms.worldInvTranspose + '* norm;'

                                ].join('\n')),

                            '#else',
                            Names.varyings.worldNormal + ' =  norm;'

                        ].join('\n'))
                    ),

                ifDef(
                    Defines.tangents,
                    ifnDef(
                        Defines.noWorldTransform,
                        [
                            Names.varyings.worldTangent + ' = (' + Names.uniforms.worldTransform + '* tang).xyz;',
                            '#else',
                            Names.varyings.worldTangent + ' = tang.xyz;',

                        ].join('\n'))
                    ),
                
                ifDef(
                    Defines.textCoordsTransform,
                    [
                        Names.varyings.textCoord + ' = (' + Names.uniforms.textCoordTransform +'* vec3(' + Names.attributes.textCoord + ', 1.0)).xy;',                        
                        '#else',
                        ifDef(
                            Defines.textCoords,
                            Names.varyings.textCoord + ' = ' + Names.attributes.textCoord + ';')
                    ].join('\n'))                
            ],

            shadowDirectionalLights:
                ifDef(
                    Defines.shadowDirLights,
                    [
                        'for(int i = 0 ; i < ' + Defines.shadowDirLightsCount + '; i++)',
                            Names.varyings.dirShadowPositions +'[i] = ' + Names.uniforms.dirShadowTransforms + '[i] * worldPos;',

                    ].join('\n')),

            shadowSpotLights: 
                ifDef(
                    Defines.shadowSpotLights,
                    [
                        'for(int i = 0 ; i < ' + Defines.shadowSpotLightsCount + '; i++)',
                            Names.varyings.spotShadowPositions + '[i] = ' + Names.uniforms.spotShadowTransforms + '[i] * worldPos;',

                    ].join('\n'))
        }),

        fragmentShader: joinObj({
                        
            color :
                ifnDef(
                    Defines.colorMap,
                    [
                        ifDef(
                            Defines.color,
                            [
                                'vec4 textureColor = ' + Names.uniforms.color +';',
                                '#else',
                                'vec4 textureColor = vec4(0.0,0.0,0.0,1.0);'

                            ].join('\n')),

                        '#else',
                        'vec4 textureColor = texture2D('+ Names.uniforms.colorMap + ',' + Names.varyings.textCoord + ');'
                    ].join('\n')),
                
            bumpMap: 
                ifDef(
                    Defines.bumpMap,
                    [
                        ifDef(
                            Defines.envMap,
                            //keep the normalized normal for sampling the environment map
                            'vec3 worldNormal = normal;'),
                        'normal = normalSampleToWorldSpace(texture2D(' + Names.uniforms.bumpMap + ',' + Names.varyings.textCoord + ').rgb, normal, ' + Names.varyings.worldTangent + ');'                        
                        
                    ].join('\n')),

            specMap : 
                ifDef(
                    Defines.specMap,
                    'specularTerm *= texture2D(' + Names.uniforms.specularMap + ', ' + Names.varyings.textCoord + ');'),
                        
            directionalLights : 
                ifDef(
                    Defines.dirLights,
                    [
                        'for (int i = 0; i < ' + Defines.dirLightsCount + '; i++){',                            
                            'ComputeDirectionalLight(' + Names.uniforms.directionalLights + '[i], normal, toEye, D, S);',
                            'diffuseTerm += D;',
                            'specularTerm += S;',
                        '}'

                    ].join('\n')),

            spotLights :
                ifDef(
                    Defines.spotLights,
                    [
                        'for (int i = 0 ; i < ' + Defines.spotLightsCount + ';i++){',                            
                            'ComputeSpotLight(' + Names.uniforms.spotLights + '[i], ' + Names.varyings.worldPosition + ', normal, toEye, D, S);',
                            'diffuseTerm += D;',
                            'specularTerm += S;',
                        '}'

                    ].join('\n')),

            pointLights :
                ifDef(
                    Defines.pointLights,
                    [
                        'for (int i = 0 ; i < ' + Defines.pointLightsCount + ';i++){',
                            'ComputePointLight(' + Names.uniforms.pointLights +'[i], ' + Names.varyings.worldPosition + ', normal, toEye, D, S);',
                            'diffuseTerm += D;',
                            'specularTerm += S;',
                        '}'

                    ].join('\n')),

            shadowDirectionalLights : 
                ifDef(
                    Defines.shadowDirLights,
                    [
                        'for (int i = 0 ; i < ' + Defines.shadowDirLightsCount + ';i++){',
                            'ComputeDirectionalLight(' + Names.uniforms.shadowDirectionalLights + '[i], normal, toEye, D,S);',
                            ifDef(
                                Defines.shadows,
                                [
                                    'vec4 shadowPos = ' + Names.varyings.dirShadowPositions +'[i];',
                                    'float depth = shadowPos.z;',
                                    'vec2 shadowMapCoord = shadowPos.xy;',
                                    'vec3 shadowMapParams = ' +  Names.uniforms.dirShadowMapSizeAndBias + '[i];',
                                    'float shadowFactor = calcShadowFactor(' + Names.uniforms.dirShadowMaps +'[i], depth + shadowMapParams.z, shadowMapCoord, shadowMapParams.xy);',
                                    'bvec4 inside = bvec4(shadowMapCoord.x >= 0.0, shadowMapCoord.x <= 1.0, shadowMapCoord.y >= 0.0, shadowMapCoord.y <= 1.0);',
                                    'bool infrustum = all(inside);',
                                    'infrustum = all(bvec2(infrustum, depth <= 1.0));',
                                    'float occlusion = float(infrustum)*(shadowFactor);',
                                    'diffuseTerm += D * occlusion;',
                                    'specularTerm += S * occlusion;',

                                    '#else',

                                    'diffuseTerm += D;',
                                    'specularTerm += S;'

                                ].join('\n')),
                        '}'

                    ].join('\n')),

            shadowSpotLights : 
                ifDef(
                    Defines.shadowSpotLights,
                    [                        
                        'for (int i = 0 ; i < ' + Defines.shadowSpotLightsCount + ';i++){',
                            'ComputeSpotLight(' + Names.uniforms.shadowSpotLights + '[i], ' + Names.varyings.worldPosition +', normal, toEye, D, S);',
                            ifDef(
                                Defines.shadows,
                                [
                                    'vec4 shadowPos = ' + Names.varyings.spotShadowPositions + '[i];',
                                    'float invW = 1.0 / shadowPos.w;',
                                    'float depth = shadowPos.z * invW ;',
                                    'vec2 shadowMapCoord = shadowPos.xy  * invW;',
                                    'vec3 shadowMapParams = ' + Names.uniforms.spotShadowMapSizeAndBias + '[i];',
                                    'float shadowFactor = calcShadowFactor(' + Names.uniforms.spotShadowMaps + '[i], depth + shadowMapParams.z, shadowMapCoord, shadowMapParams.xy);',
                                    'bvec4 inside = bvec4(shadowMapCoord.x >= 0.0, shadowMapCoord.x <= 1.0, shadowMapCoord.y >= 0.0, shadowMapCoord.y <= 1.0);',
                                    'bool infrustum = all(inside);',
                                    'infrustum = all(bvec2(infrustum, depth <= 1.0));',
                                    'float occlusion = float(infrustum)*(shadowFactor);',
                                    'diffuseTerm += D * occlusion;',
                                    'specularTerm += S * occlusion;',
                                    
                                    '#else',

                                    'diffuseTerm += D;',
                                    'specularTerm += S;'

                                ].join('\n')),
                        '}'                     

                    ].join('\n')),

            shadowPointLights : 
                ifDef(
                    Defines.shadowPointLights,
                    [
                        'for (int i = 0 ; i < ' + Defines.shadowPointLightsCount +'; i++){',
                            'ComputePointLight(' + Names.uniforms.shadowPointLights + '[i], ' + Names.varyings.worldPosition + ', normal, toEye, D, S);',
                            ifDef(
                                Defines.shadows,
                                [
                                    'vec3 toFragment = (' + Names.varyings.worldPosition + ' - ' + Names.uniforms.pointPositionAndBiases + '[i].xyz);',
                                    'float shadowFactor = calcShadowFactor(' + Names.uniforms.pointShadowMaps + '[i], ' + Names.uniforms.pointPositionAndBiases + '[i].w, toFragment);',                                    
                                    'diffuseTerm += D * shadowFactor;',
                                    'specularTerm += S * shadowFactor;',

                                    '#else',

                                    'diffuseTerm += D;',
                                    'specularTerm += S;'

                                ].join('\n')),
                        '}'

                    ].join('\n')),

            fog:
                ifDef(
                    Defines.fog,
                    [
                        'float s = (toEyeDistance - ' + Names.uniforms.fogStartDistanceAndRange +'.x) / ' + Names.uniforms.fogStartDistanceAndRange + '.y;',
                        's = clamp(s, 0.0, 1.0);',
                        'gl_FragColor = mix(gl_FragColor, ' + Names.uniforms.fogColor + ', s) ;'

                    ].join('\n')),

            envMap:
                ifDef(
                    Defines.envMap,
                    [
                        ifDef(
                            Defines.bumpMap,
                            [
                                'vec3 reflVector = reflect(-toEye, worldNormal);',
                                '#else',
                                'vec3 reflVector = reflect(-toEye, normal);'
                            ].join('\n')),

                        ifDef(
                            Defines.envMapMultiply,
                            
                            [
                                'gl_FragColor *= textureCube(' + Names.uniforms.environmentMap + ', reflVector) *' + Names.uniforms.materialReflect + ';',

                                '#elif defined(' + Defines.envMapAdd + ')',
                                    'gl_FragColor += textureCube(' + Names.uniforms.environmentMap + ', reflVector) *' + Names.uniforms.materialReflect + ';',

                                '#else',
                                    'gl_FragColor = mix(gl_FragColor,  textureCube(' + Names.uniforms.environmentMap + ', reflVector), ' + Names.uniforms.materialReflect + ');'

                            ].join('\n')),                                               

                    ].join('\n'))
        })
    };
    
    var ShaderSources = {
        genericVertexShader: '',
        genericFragmentShader: '',
        depthVertex: '',
        depthFragment: '',
        skyBoxVertex: '',
        skyBoxFragment: '',
        postEffectVertex : ''
    };
    
    ShaderSources.genericVertexShader = (function () {

        var vertexShaderParams = ShadersParams.vertexShader;
        var attributes = vertexShaderParams.attributes;
        var uniforms = vertexShaderParams.uniforms;
        var varyings = ShadersParams.varyings;

        var params =
            Defines.dependencies.common + 
            Defines.dependencies.vertexShader + 

            attributes.position +
            attributes.normal +
            attributes.textCoord +
            attributes.tangent+ 
            attributes.skin +
            uniforms.viewTransform +
            uniforms.projection + 
            uniforms.worldTransform + 
            uniforms.worldInvTranspose +

            uniforms.bonesTransforms + 
            uniforms.bonesInvTransposes +
            
            uniforms.textCoordTransform +

            uniforms.shadowDirectionalLights + 
            uniforms.shadowSpotLights+
            uniforms.displMap + 
            
            varyings.worldPosition +
            varyings.clipPosition +
            varyings.worldNormal  + 
            varyings.textCoord+ 
            varyings.worldTangent + 
            varyings.dirShadowPositions + 
            varyings.spotShadowPositions 
            ;

        var chunks = ShadersChunks.vertexShader;

        var main = [
            'void main(){',
                'vec4 pos = vec4(' + Names.attributes.position + ',1.0);',                
                ifDef(
                    Defines.normals,
                    'vec3 norm = ' + Names.attributes.normal + ';'),
                chunks.displMap,
                ifDef(
                    Defines.tangents,
                    'vec4 tang = vec4(' + Names.attributes.tangent + ',0.0);'),
                chunks.skinning,                
                'vec4 worldPos;',
                chunks.transforms,
                chunks.shadowDirectionalLights,
                chunks.shadowSpotLights,
                ifnDef(
                    Defines.noViewTransform,
                    [
                        ifDef(
                            Defines.noProjection,
                            [
                                'gl_Position = ' + Names.uniforms.viewTransform + '* worldPos;',
                                '#else',
                                'gl_Position = ' + Names.uniforms.projectionView + '* worldPos;',
                            ].join('\n')),

                        '#else',

                        ifDef(
                            Defines.noProjection,
                            [
                                'gl_Position = worldPos;',
                                '#else',
                                'gl_Position = ' + Names.uniforms.projection + '* worldPos;',
                            ].join('\n'))

                    ].join('\n')),
                ifDef(
                    Defines.ssaoMap,
                    Names.varyings.clipPosition + '= gl_Position;'),
                '}'
        ].join('\n');

                
        return params + main;
        
    })();

    ShaderSources.genericFragmentShader = (function () {

        var fragmentShaderParams = ShadersParams.fragmentShader;        
        var uniforms = fragmentShaderParams.uniforms;
        var varyings = ShadersParams.varyings;

        var params =
            Defines.dependencies.common +
            Defines.dependencies.fragmentShader +

            'precision mediump float;' + '\n' + 
            
            varyings.worldPosition +
            varyings.clipPosition + 
            varyings.worldNormal +
            varyings.textCoord +
            varyings.worldTangent +
            varyings.dirShadowPositions +
            varyings.spotShadowPositions + 

            uniforms.fog +            
            uniforms.ambientLight +
            uniforms.ssaoMap +

            uniforms.litMat +
            
            uniforms.eyePosition +
            
            uniforms.color +
            uniforms.colorMap +
            
            uniforms.envMap +

            uniforms.bumpMap +
            uniforms.specMap +

            functions.diffuseFactor + 
            functions.specularFactor + 
            functions.directionalLights +
            functions.spotLights +
            functions.pointLights +

            uniforms.directionalLights +
            uniforms.spotLights +
            uniforms.pointLights +
            uniforms.shadowDirectionalLights +
            uniforms.shadowSpotLights +
            uniforms.shadowPointLights +

            functions.shadows +
            functions.bumpSampleProc 
        ;
                
        var chunks = ShadersChunks.fragmentShader;

        var main = [
            'void main(){',
                ifDef(
                    Defines.normals,
                    'vec3 normal = normalize(' + Names.varyings.worldNormal +');'),
                
                ifDef(
                    Defines.eyePos,
                    [
                        'vec3 toEye = ' + Names.uniforms.eyePosition +'- ' + Names.varyings.worldPosition + ';',
                        ifDef(
                            Defines.fog,
                            [
                                'float toEyeDistance = length(toEye);',
                                'toEye /= toEyeDistance;',
                                '#else',
                                'toEye = normalize(toEye);'

                            ].join('\n'))

                    ].join('\n')),                

                chunks.color,
                chunks.bumpMap,
                
                ifDef(
                    Defines.lightSource,
                    [
                        'vec4 diffuseTerm = vec4(0.0,0.0,0.0,0.0);',
                        'vec4 D;',
                        'vec4 specularTerm = vec4(0.0,0.0,0.0,0.0);',
                        'vec4 S;',

                    ].join('\n')),

                chunks.directionalLights,
                chunks.shadowDirectionalLights,

                chunks.spotLights,
                chunks.shadowSpotLights,

                chunks.pointLights,
                chunks.shadowPointLights,

                'gl_FragColor = textureColor;',
                
                ifDef(
                    Defines.light,
                    [
                        'vec4 ambientTerm = ' + Names.uniforms.ambientLight + '*' + Names.uniforms.materialAmbient + ';',
                        ifDef(
                            Defines.ssaoMap,
                            [
                                'vec2 positionNDC = ' + Names.varyings.clipPosition + '.xy/' + Names.varyings.clipPosition + '.w;',
                                'ambientTerm.xyz *= texture2D(' + Names.uniforms.ssaoMap + ', positionNDC*0.5+0.5).r;',

                            ].join('\n')
                        ),
                        ifDef(
                            Defines.lightSource,
                            [
                                'diffuseTerm *= ' + Names.uniforms.materialDiffuse + ';',
                                'specularTerm *= ' + Names.uniforms.materialSpecular + ';',
                                chunks.specMap,
                                'gl_FragColor *= diffuseTerm;',
                                'gl_FragColor += ambientTerm + specularTerm;',

                                '#else',
                                'gl_FragColor += ambientTerm;'

                            ].join('\n'))
                    ].join('\n')),
                
                chunks.fog,
                chunks.envMap,

                '}'
        ].join('\n');


        return params + main;

    })();


    ShaderSources.skyBoxVertex = (function () {
        
        var vertexShaderParams = ShadersParams.vertexShader;

        var params =

            define(Defines.eyePos,null, true) +

            vertexShaderParams.attributes.position + 

            vertexShaderParams.uniforms.projection + 
            ShadersParams.fragmentShader.uniforms.eyePosition + 
            ShadersParams.varyings.worldPosition ;

        var main = 
            [
                'void main(){',
                    'vec3 position = ' + Names.attributes.position + '+ ' + Names.uniforms.eyePosition +';',
                    'gl_Position = ' + Names.uniforms.projectionView + '* vec4(position,1.0);',
                    'gl_Position.z = gl_Position.w;',
                    Names.varyings.worldPosition + '= ' + Names.attributes.position +';',
                '}'

            ].join('\n');

        return params + main;

    })();


    ShaderSources.skyBoxFragment = (function () {

        var params = 
            'precision mediump float;\n' +

            ShadersParams.varyings.worldPosition + 
            
            'uniform samplerCube ' + Names.uniforms.skyBox +';\n' ;

        var main = 
            [
                'void main(){',
                    'vec3 dirCoord = normalize(' + Names.varyings.worldPosition + ');',
                    'gl_FragColor = textureCube(' + Names.uniforms.skyBox + ',dirCoord);',
                '}'

            ].join('\n');

        return params + main;

    })();


    ShaderSources.depthVertex = (function () {

        var vertexShaderParams = ShadersParams.vertexShader;

        var params =
            
            Defines.dependencies.vertexShader +
            
            vertexShaderParams.attributes.position + 
            vertexShaderParams.attributes.skin + 

            vertexShaderParams.uniforms.bonesTransforms + 
            
            vertexShaderParams.uniforms.projection + 

            vertexShaderParams.uniforms.worldTransform  +

            ifDef(
               Defines.pointLightShadowMap,
               ShadersParams.varyings.worldPosition, true);
            
        var main =
            [
                'void main(){',
                    'vec4 pos = vec4(a_position,1.0);',
                    ifDef(
                        Defines.skinned,
                        [
                            'vec3 localPos = vec3(0.0,0.0,0.0);',
                            'for(int i = 0 ; i < ' + Defines.influencesPerVertex + '; i++)',
                                'localPos += ' + Names.attributes.skinWeight + '[i]*(' + Names.uniforms.bonesTransforms + '[int(' + Names.attributes.skinIndex  + '[i])]*pos).xyz;',
                            'pos = vec4(localPos, 1.0);'    
                        ].join('\n')),
                    'vec4 worldPos = ' + Names.uniforms.worldTransform + '* pos;',
                    ifDef(
                        Defines.pointLightShadowMap,
                        Names.varyings.worldPosition + '= worldPos.xyz;'),
                    'gl_Position = '+ Names.uniforms.projectionView +' * worldPos;',
                '}'

            ].join('\n');

            
        return params + main;
    })();


    ShaderSources.depthFragment = (function () {

        var params = 
            'precision mediump float;\n' + 
            
            functions.packShadows + 

            ifDef(
                Defines.pointLightShadowMap,
                [
                    define(Defines.eyePos),
                    ShadersParams.varyings.worldPosition,
                    ShadersParams.fragmentShader.uniforms.eyePosition,
                    'uniform float ' + Names.uniforms.invSquaredSceneSize +';'
                    
                ].join('\n'), true);

        var main = 
            [
                'void main(){',
                    ifDef(
                        Defines.pointLightShadowMap,
                        [
                            'vec3 lightDir = ' + Names.varyings.worldPosition + '-' + Names.uniforms.eyePosition +';',
                            'float squaredLen = dot(lightDir,lightDir) * ' + Names.uniforms.invSquaredSceneSize + ';',
                            'gl_FragColor = pack(squaredLen);',

                            '#else',
                            'gl_FragColor = pack(gl_FragCoord.z);'

                        ].join('\n')),
                '}'
            
            ].join('\n');

        return params + main;

    })();

    ShaderSources.postEffectVertex = (function () {

        var params =

            ShadersParams.vertexShader.attributes.position +
            define(Defines.textCoords, null, true) +
            ShadersParams.vertexShader.attributes.textCoord +
            ShadersParams.varyings.textCoord;
        
        var main = 
            [
                'void main(){',
                    Names.varyings.textCoord + ' = ' + Names.attributes.textCoord + ';',
                    'gl_Position = vec4(' + Names.attributes.position + ',1.0);',
                '}'

            ].join('\n');

        return params + main;

    })();

    return {
        Defines: Defines,
        Names: Names,
        customTypes: customTypes,
        functions : functions,
        define: define,
        ShaderSources : ShaderSources
    };

});