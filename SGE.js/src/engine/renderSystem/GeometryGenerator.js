define(['core/VMath', 'core/DataType', 'core/Buffers', './Meshes', './Programs'], function (VMath, DataType, Buffers, Meshes, Programs) {

    'use strict';

    var defaultPositionAttribute = Programs.Names.attributes.position;
    var defaultNormalAttribute = Programs.Names.attributes.normal;
    var defaultTextCoordAttribute = Programs.Names.attributes.textCoord;
    var defaultTangentAttribute = Programs.Names.attributes.tangent;
    var defaultSkinIndicesAttribute = Programs.Names.attributes.skinIndex;
    var defaultSkinWeightsAttribute = Programs.Names.attributes.skinWeight;
    
    var currPositionAttribute;
    var currNormalAttribute;
    var currTextCoordAttribute;
    var currTangentAttribute;
    var currSkinIndicesAttribute;
    var currSkinWeightsAttribute;
        
    setDefaultAttributes();

    function setDefaultAttributes() {
        currPositionAttribute = defaultPositionAttribute;
        currNormalAttribute = defaultNormalAttribute;
        currTextCoordAttribute = defaultTextCoordAttribute;
        currTangentAttribute = defaultTangentAttribute;
        currSkinIndicesAttribute = defaultSkinIndicesAttribute;
        currSkinWeightsAttribute = defaultSkinWeightsAttribute;
    }

    function buildGeometry(positions, indices, normals, tangents, textCoords, skinIndices, skinWeights, keepPositions) {

        var parameters = {};
        keepPositions = keepPositions != null ? keepPositions : true;

        var vertexCount = positions.length / 3;

        var skinned = skinIndices != null && skinWeights != null;
        var influencesPerVertex = skinned ? skinIndices.length / vertexCount : null;

        if (skinned)
            var skinInfluences = processSkinIndices(skinIndices);

        var indexType;

        var indexed = true;
        
        if (vertexCount <= 256) {
            indices = new Uint8Array(indices);
            indexType = DataType.UNSIGNED_BYTE;
        } else if (vertexCount <= 65536) {
            indices = new Uint16Array(indices);
            indexType = DataType.UNSIGNED_SHORT;
        } else {
            indexed = false;

            positions = unIndexingBuffer(positions, indices, 3);
            vertexCount = positions.length / 3;

            if (normals != null)
                normals = unIndexingBuffer(normals, indices, 3);
            if (tangents != null)
                tangents = unIndexingBuffer(tangents, indices, 3);
            if (textCoords != null)
                textCoords = unIndexingBuffer(textCoords, indices, 2);
            if (skinned) {
                skinIndices = unIndexingBuffer(skinIndices, indices, influencesPerVertex);
                skinWeights = unIndexingBuffer(skinWeights, indices, influencesPerVertex);
            }
        }

        //build index buffer        
        if (indexed)
            parameters.indexBuffer = Buffers.createIndexBuffer(indices, indexType);

        //build vertex buffer
        var vertexLayout = new Buffers.VertexLayout();
        vertexLayout.addAttributeDesc(currPositionAttribute, 3, DataType.FLOAT);
        var dataMap = { a_position: new Float32Array(positions) };
        if (keepPositions)
            parameters.positions = convertToVector(dataMap.a_position, 3);

        if (normals != null) {
            vertexLayout.addAttributeDesc(currNormalAttribute, 3, DataType.FLOAT);
            dataMap.a_normal = new Float32Array(normals);            
        }
        if (tangents != null) {
            vertexLayout.addAttributeDesc(currTangentAttribute, 3, DataType.FLOAT);
            dataMap.a_tangent = new Float32Array(tangents);            
        }
        if (textCoords != null) {
            vertexLayout.addAttributeDesc(currTextCoordAttribute, 2, DataType.FLOAT);
            dataMap.a_textCoord = new Float32Array(textCoords);            
        }
        if (skinned) {
            vertexLayout.addAttributeDesc(currSkinWeightsAttribute, influencesPerVertex, DataType.FLOAT);
            vertexLayout.addAttributeDesc(currSkinIndicesAttribute, influencesPerVertex, DataType.FLOAT);
            dataMap.a_skinWeights = new Float32Array(skinWeights);
            dataMap.a_skinIndices = new Float32Array(skinIndices);
            parameters.influences = skinInfluences;
            parameters.influencesPerVertex = influencesPerVertex;
        }

        parameters.vertexBuffer = Buffers.createVertexBuffer(vertexLayout, dataMap, vertexCount);

        if (skinned)
            return new Meshes.SkinnedMesh(parameters);
        else
            return new Meshes.Mesh(parameters);
    }
            
    function increasingSort(a, b) {
        return a - b;
    }

    function processSkinIndices(skinIndices) {
        var indices = {};
        
        //find distinct influences
        var indexCount = skinIndices.length;
        for (var i = 0; i < indexCount ; i++) {
            var index = skinIndices[i];
            indices[index] = true;
        }

        var sorted = [];
        for (var key in indices) 
            sorted.push(key);     
        
        sorted.sort(increasingSort);

        var count = sorted.length;
        for (var i = 0; i < count; i++)
            indices[sorted[i]] = i;
        
        for (var i = 0 ; i < indexCount; i++) {
            var index = skinIndices[i];
            skinIndices[i] = indices[index];
        }

        return sorted;
    }

    function unIndexingBuffer(data, indices, componentsCount) {

        var indexCount = indices.length;
        var newData = [];
        var primitiveIndex;
        for (var i = 0 ; i < indexCount; i++) {
            primitiveIndex = indices[i];
            
            primitiveIndex *= componentsCount;
            for (var k = 0; k < componentsCount; k++) 
                newData.push(data[primitiveIndex + k]);
        }
        return newData;
    }

    function convertToVector(data, componentsCount) {

        var ctor;
        var setFun;

        switch (componentsCount) {
            case 2:
                ctor = VMath.Vector2Array;
                setFun = setVector2;
                break;
            case 3:
                ctor = VMath.Vector3Array;
                setFun = setVector3;
                break;
            case 4:
                ctor = VMath.Vector4Array;
                setFun = setVector4;
                break;
            default:
                throw new Error('invalid componentsCount');
        }

        var vertexCount = data.length / componentsCount;
        var dest = new ctor(vertexCount);

        for (var i = 0; i < vertexCount; i++) {
            var index = i * componentsCount;
            setFun(data, index, dest.get(i));
        }

        return dest;
    }
    
    function setVector2(data, index, dest) {
        dest.set(data[index],data[index+1]);
    }

    function setVector3(data, index, dest){
        dest.set(data[index], data[index + 1], data[index + 2]);
    }

    function setVector4(data, index, dest){
        dest.set(data[index], data[index + 1], data[index + 2], data[index + 3]);
    }
    
    //Adapted from '3D Game Programming with DirectX 11' by Frank Luna (http://www.d3dcoder.net/d3d11.htm)

    function boxGeometry(width, height, depth, genTextCoord, genNormal, genTangent) {

        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;

        var w2 = 0.5 * width;
        var h2 = 0.5 * height;
        var d2 = 0.5 * depth;

        var positions = [

            // Front face
            -w2, -h2, d2,
             w2, -h2, d2,
             w2, h2, d2,
            -w2, h2, d2,

            // Back face
            -w2, -h2, -d2,
            -w2, h2, -d2,
             w2, h2, -d2,
             w2, -h2, -d2,

            // Top face
            -w2, h2, -d2,
            -w2, h2, d2,
             w2, h2, d2,
             w2, h2, -d2,

            // Bottom face
            -w2, -h2, -d2,
             w2, -h2, -d2,
             w2, -h2, d2,
            -w2, -h2, d2,

            // Right face
             w2, -h2, -d2,
             w2, h2, -d2,
             w2, h2, d2,
             w2, -h2, d2,

            // Left face
            -w2, -h2, -d2,
            -w2, -h2, d2,
            -w2, h2, d2,
            -w2, h2, -d2
        ];

        var indices = [

            // Front face
            0, 1, 2,
            0, 2, 3,

            // Back face
            4, 5, 6,
            4, 6, 7,

            // Top face
            8, 9, 10,
            8, 10, 11,

            // Bottom face
            12, 13, 14,
            12, 14, 15,

            // Right face
            16, 17, 18,
            16, 18, 19,

            // Left face
            20, 21, 22,
            20, 22, 23

        ];

        var normals = null;

        if (genNormal) {

            var posX = new VMath.Vector3(1.0, 0.0, 0.0);
            var posY = new VMath.Vector3(0.0, 1.0, 0.0);
            var posZ = new VMath.Vector3(0.0, 0.0, 1.0);
            var negX = new VMath.Vector3(-1.0, 0.0, 0.0);
            var negY = new VMath.Vector3(0.0, -1.0, 0.0);
            var negZ = new VMath.Vector3(0.0, 0.0, -1.0);
                                   
            //corners' normals looking down the negative z axis
                        
            var vertexNormals = [
                //Front face
                VMath.Vector3.add(negX, negY).add(posZ),
                VMath.Vector3.add(posX, negY).add(posZ),
                VMath.Vector3.add(posX, posY).add(posZ),
                VMath.Vector3.add(negX, posY).add(posZ),
                
                //Back face
                VMath.Vector3.add(negX, negY).add(negZ),
                VMath.Vector3.add(negX, posY).add(negZ),
                VMath.Vector3.add(posX, posY).add(negZ),
                VMath.Vector3.add(posX, negY).add(negZ)
            ];
                                     
            //normalize normals
            for (var i = 0; i < 8; i++) 
                vertexNormals[i].normalize();
            
            var frontFaceIndex = 0;
            var backFaceIndex = 4;

            //Top face
            vertexNormals.push(vertexNormals[backFaceIndex + 1]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 3]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 2]);
            vertexNormals.push(vertexNormals[backFaceIndex + 2]);

            //Bottom face
            vertexNormals.push(vertexNormals[backFaceIndex + 0]);
            vertexNormals.push(vertexNormals[backFaceIndex + 3]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 1]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 0]);

            //Right face
            vertexNormals.push(vertexNormals[backFaceIndex + 3]);
            vertexNormals.push(vertexNormals[backFaceIndex + 2]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 2]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 1]);

            //Left face
            vertexNormals.push(vertexNormals[backFaceIndex + 0]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 0]);
            vertexNormals.push(vertexNormals[frontFaceIndex + 3]);
            vertexNormals.push(vertexNormals[backFaceIndex + 1]);

            normals = [];
            for (var i = 0; i < 24 ; i++) {
                var vertexNormal = vertexNormals[i];
                normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
            }
            
        }

        var tangents = null;

        if (genTangent)
            tangents = [

                // Front face
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,

                // Back face
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,

                // Top face                
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,

                //Bottom face
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,
                -1.0, 0.0, 0.0,

                // Right face
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,

                // Left face
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0

            ];

        var textCoords = null;

        if (genTextCoord)
            textCoords = [

                // Front face
                0.0, 0.0,
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0,

                // Back face
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0,
                0.0, 0.0,

                // Top face
                0.0, 1.0,
                0.0, 0.0,
                1.0, 0.0,
                1.0, 1.0,

                // Bottom face
                1.0, 1.0,
                0.0, 1.0,
                0.0, 0.0,
                1.0, 0.0,

                // Right face
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0,
                0.0, 0.0,

                // Left face
                0.0, 0.0,
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0
            ];

        return buildGeometry(positions, indices, normals, tangents, textCoords);
    }

    var PI = Math.PI;
    var _2PI = 2.0 * PI;

    //Adapted from '3D Game Programming with DirectX 11' by Frank Luna (http://www.d3dcoder.net/d3d11.htm)

    function sphereGeometry(radius, sliceCount, stackCount, genTextCoord, genNormal, genTangent) {

        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;
                               
        //
        // Compute the vertices stating at the top pole and moving down the stacks.
        //
        
        var positions = [0.0, radius, 0.0];
        var normals = null;
        var tangents = null;
        var textCoords = null;

        if(genNormal)
            normals =[0.0,1.0,0.0];
        if(genTangent)
            tangents = [1.0,0.0,0.0];
        if(genTextCoord)
            textCoords = [0.0,1.0];
               
        var phiStep = PI / stackCount;
        var thetaStep = _2PI /sliceCount;
        var i;
        var j;
        var phi;
        var theta;
        var cosPhi;
        var sinPhi;
        var sinTheta;
        var cosTheta;
        var vector3;
        var index;

        // Compute vertices for each stack ring (do not count the poles as rings).
        for(i = 1; i <= stackCount-1; i++){

            phi = i*phiStep;

            // Vertices of ring.
            for(j = 0; j <= sliceCount; j++){

                theta = j*thetaStep;

                sinPhi = Math.sin(phi);
                sinTheta = Math.sin(theta);
                cosPhi = Math.cos(phi);
                cosTheta = Math.cos(theta);
                                
                // spherical to cartesian
                positions.push(                    
                    //x
                    radius * sinPhi * cosTheta,
                    //y
                    radius* cosPhi,
                    //z
                    radius * sinPhi * sinTheta
                );

                if(genNormal){

                    index = positions.length;

                    vector3 = new VMath.Vector3(
                        //x
                        positions[index-3],
                        //y
                        positions[index-2],
                        //z
                        positions[index-1]).normalize().data;
                    
                    normals.push(vector3[0],vector3[1],vector3[2]);

                }

                if(genTangent){

                    // Negate the partial derivative of P with respect to theta
                    // u coordinate decrease as theta increases

                    vector3 = new VMath.Vector3(
                        //x
                        -radius * sinPhi * sinTheta,
                        //y
                        0.0,
                        //z
                        radius * sinPhi * cosTheta).normalize().negate().data;
                                        
                    tangents.push(vector3[0],vector3[1],vector3[2]);
                }
                
                if(genTextCoord)
                    textCoords.push(
                        //u
                        1.0 - theta / _2PI,
                        //v
                        1.0 - phi / PI
                    );                
            }
        }
        
        //south pole vertex
        positions.push(0.0,-radius,0.0);

        if(genNormal)
            normals.push(0.0,-1.0,0.0);
        if(genTangent)
            tangents.push(1.0,0.0,0.0);
        if(genTextCoord)
            textCoords.push(0.0,0.0);
                     

        //indices
        var indices = [];

        //
        // Compute indices for top stack which connects the top pole to the first ring.
        //

        for(i = 1; i <= sliceCount; i++)
            indices.push(
                0,
                i+1,
                i                
            );        
	
        //
        // Compute indices for inner stacks (not connected to poles).
        //

        // Offset the indices to the index of the first vertex in the first ring.
        // This is just skipping the top pole vertex.
        var baseIndex = 1;
        var ringVertexCount = sliceCount+1;
        for(i = 0; i < stackCount-2; i++){

            for(j = 0; j < sliceCount; j++){
                
                indices.push(

                    baseIndex + i*ringVertexCount + j,
                    baseIndex + i * ringVertexCount + j + 1,
                    baseIndex + (i + 1) * ringVertexCount + j,
                    

                    baseIndex + (i+1)*ringVertexCount + j,                    
                    baseIndex + i*ringVertexCount + j+1,
                    baseIndex + (i+1)*ringVertexCount + j+1

                );
            }
        }

        //
        // Compute indices for bottom stack which connects the bottom pole to the bottom ring.
        //

        var vertexCount = positions.length / 3;
        
        // South pole vertex was added last.
        var southPoleIndex = vertexCount - 1;

        // Offset the indices to the index of the first vertex in the last ring.
        baseIndex = southPoleIndex - ringVertexCount;
	
        for (i = 0; i < sliceCount; i++) 
            indices.push(
                southPoleIndex,
                baseIndex+i,
                baseIndex + i + 1                
            );

        return buildGeometry(positions, indices, normals,tangents,textCoords);
    }

    //Adapted from '3D Game Programming with DirectX 11' by Frank Luna (http://www.d3dcoder.net/d3d11.htm)

    function cilynderGeometry(bottomRadius, topRadius, height, sliceCount, stackCount, genTextCoord, genNormal, genTangent) {

        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;
                       
        var positions = [];
        var normals = null;
        var tangents = null;
        var textCoords = null;

        if(genNormal)
            normals =[];
        if(genTangent)
            tangents = [];
        if(genTextCoord)
            textCoords = [];
                
        //
        // Build Stacks.
        // 

        var stackHeight = height / stackCount;

        // Amount to increment radius as we move up each stack level from bottom to top.
        var dr = topRadius - bottomRadius;
        var radiusStep = dr / stackCount;

        var ringCount = stackCount+1;

        var i;
        var y;
        var r;
        var dTheta = _2PI /sliceCount;
        var j;
        var c;
        var s;
        var tangent = new VMath.Vector3();
        var bitangent = new VMath.Vector3();        
        if (genNormal)
            var normal = new VMath.Vector3();

        // Compute vertices for each stack ring starting at the bottom and moving up.
        for(i = 0; i < ringCount; i++){
        
            y = -0.5 * height + i * stackHeight;
            r = bottomRadius + i * radiusStep;

            // vertices of ring
            
            for(j = 0; j <= sliceCount; j++){

                c = Math.cos(j*dTheta);
                s = Math.sin(j*dTheta);

                positions.push(
                    //x
                    r * c, 
                    //y
                    y,
                    //z
                    r * s
                );
                
                if(genTextCoord)
                    textCoords.push(
                        //u
                        1.0 - j / sliceCount,
                        //v
                        i / stackCount
                    );
                
                // Cylinder can be parameterized as follows, where we introduce v
                // parameter that goes in the same direction as the v tex-coord
                // so that the bitangent goes in the same direction as the v tex-coord.
                //   Let r0 be the bottom radius and let r1 be the top radius.                
                //   y(v) = hv for v in [0,1].
                //   r(v) = r0 + (r1-r0)v
                //
                //   x(t, v) = r(v)*cos(t)
                //   y(t, v) = y(v)
                //   z(t, v) = r(v)*sin(t)
                // 
                //  dx/dt = -r(v)*sin(t) = - z(t,v)
                //  dy/dt = 0
                //  dz/dt = +r(v)*cos(t) = x(t,v)
                //
                //  dx/dv = (r1-r0)*cos(t)
                //  dy/dv = h
                //  dz/dv = (r1-r0)*sin(t)                             

                //u decreases as t increases, so negate the tangent
                // should be (-s*r, 0.0, c*r) but this is unit length.
                tangent.set(-s, 0.0, c).negate();
                                                                
                if (genNormal) {

                    bitangent.set(dr * c, height, dr * s);

                    normal.fromVector3(tangent).cross(bitangent).normalize();

                    normals.push(
                        //x
                        normal.x,
                        //y
                        normal.y,
                        //z       
                        normal.z
                    );
                }

                if(genTangent){
                    
                    tangents.push(
                        //x
                        tangent.x,
                        //y
                        tangent.y,
                        //z
                        tangent.z
                    );                    
                }                
            }
        }

        // Add one because we duplicate the first and last vertex per ring
        // since the texture coordinates are different.
        var ringVertexCount = sliceCount+1;

        var indices = [];

        // Compute indices for each stack.
        for(i = 0; i < stackCount; i++)
            for (j = 0; j < sliceCount; j++)
                indices.push(
                    i * ringVertexCount + j,
                    (i + 1) * ringVertexCount + j,
                    (i + 1) * ringVertexCount + j + 1,

                    i * ringVertexCount + j,
                    (i + 1) * ringVertexCount + j + 1,
                    i * ringVertexCount + j + 1
                );        

        //build top cap
        buildCilinderCap(0.5 * height, topRadius, true);
        //build bottom cap
        buildCilinderCap(-0.5 * height, bottomRadius, false);
        
        return buildGeometry(positions, indices, normals, tangents, textCoords);

        function buildCilinderCap(y, radius, top) {

            var baseIndex = positions.length / 3;

            var normY = top ? 1.0 : -1.0;
            var tgtX = top ? 1.0 : -1.0;
            var ringIndex = top ? ringCount - 1 : 0;
            var baseVertexIndex = 3*(ringIndex * (sliceCount + 1));
                        
            var dTheta = _2PI / sliceCount;

            // Duplicate cap ring vertices because the texture coordinates and normals differ.
            for (i = 0; i <= sliceCount; i++) {

                c = radius * Math.cos(i * dTheta);
                s = radius * Math.sin(i * dTheta);

                positions.push(
                    //x
                    c,
                    //y
                    y,
                    //z
                    s
                );

                if (genTextCoord) {
                    // Scale down by the height 
                    textCoords.push(
                        //u
                        c / height + 0.5,
                        //v
                        1.0 - (s / height + 0.5)
                    );
                }

                if (genNormal) {
                    //average cap normal (0.0, normY, 0.0)^T with previously found normal
                    var vertexIndex = baseVertexIndex + 3*i;
                    normal.set(
                        normals[vertexIndex],
                        normY + normals[vertexIndex + 1],
                        normals[vertexIndex + 2]
                        ).normalize();

                    normals[vertexIndex] = normal.x;
                    normals[vertexIndex + 1] = normal.y;
                    normals[vertexIndex + 2] = normal.z;
                    normals.push(
                        normal.x,
                        normal.y,
                        normal.z                        
                    );
                }

                if (genTangent)
                    tangents.push(
                        //x
                        tgtX,
                        //y
                        0.0,
                        //z
                        0.0
                    );
            }

            // Cap center vertex.
            positions.push(
                //x
                0.0,
                //y
                y,
                //z
                0.0
            );

            if (genTextCoord)
                textCoords.push(
                    //u
                    0.5,
                    //v
                    0.5
                );

            if (genNormal)
                normals.push(
                    //x
                    0.0,
                    //y
                    normY,
                    //z
                    0.0
                );

            if (genTangent)
                tangents.push(
                    //x
                    tgtX,
                    //y
                    0.0,
                    //z
                    0.0
                );

            // Index of center vertex.
            var centerIndex = positions.length / 3 - 1;

            for (i = 0; i < sliceCount; i++) {
                indices.push(centerIndex);
                if (top)
                    indices.push(
                        baseIndex + i + 1,
                        baseIndex + i
                     );
                else
                    indices.push(
                        baseIndex + i,
                        baseIndex + i + 1
                     );
            }

        }     
    }

    //Adapted from '3D Game Programming with DirectX 11' by Frank Luna (http://www.d3dcoder.net/d3d11.htm)

    function gridGeometry(width, depth, m, n, genTextCoord, genNormal, genTangent) {

        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;
                       
        var positions = [];
        var normals = null;
        var tangents = null;
        var textCoords = null;

        if(genNormal)
            normals =[];
        if(genTangent)
            tangents = [];
        if(genTextCoord)
            textCoords = [];

        var vertexCount = m*n;
        
        //
        // Create the vertices.
        //

        var halfWidth = 0.5 * width;
        var halfDepth = 0.5 * depth;

        var dx = width / (n-1);
        var dz = depth / (m-1);

        var du = 1.0 / (n-1);
        var dv = 1.0 / (m-1);

        var i;
        var j;
        var z;
        var x;

        for(i = 0; i < m; i++){

            z = -halfDepth + i*dz;
            for(j = 0; j < n; j++){

                x = -halfWidth + j*dx;

                positions.push( x, 0.0, z );
                
                if(genTextCoord)                    
                    textCoords.push(
                        //u
                        j * du,
                        //v
                        1.0 - i * dv
                    );
            }
        }

        if(genNormal)
            for(i = 0; i < vertexCount; i++)
                normals.push(0.0,1.0,0.0);

        if(genTangent)
            for(i = 0; i < vertexCount; i++)
                tangents.push(1.0,0.0,0.0);
         
        //
        // Create the indices.
        //
        var indices = []; 
        
        // Iterate over each quad and compute indices.
        var k = 0;
        var row;
        var nextRow;

        for (i = 0; i < m - 1; i++){

            row = i * n;
            nextRow = (i + 1) * n;

            for (j = 0; j < n - 1; j++)
                indices.push(
                    
                    row + j,
                    nextRow + j,
                    row + j + 1,
                    
                    nextRow + j,
                    nextRow + j + 1,
                    row + j + 1

                );
        }

        return buildGeometry(positions, indices, normals, tangents, textCoords);        
    }

    //Adapted from '3D Game Programming with DirectX 11' by Frank Luna (http://www.d3dcoder.net/d3d11.htm)

    function quadGeometry(genTextCoord, genNormal, genTangent) {
        
        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;
                
        var normals = null;
        var tangents = null;
        var textCoords = null;               

        // Position coordinates specified in ndc space.
        var positions = [

            // Lower left
            -1.0, -1.0, -1.0,
            
            // Lower right
            1.0, -1.0, -1.0,
            
            // Upper right
            1.0, 1.0, -1.0,

            // Upper left
            -1.0, 1.0, -1.0
        ];
        
        if(genNormal)
            normals =[
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0
            ];

        if(genTangent)
            tangents = [
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 0.0
            ];

        if(genTextCoord)
            textCoords = [

                // Lower left
                0.0, 0.0,
                
                // Lower right
                1.0, 0.0,

                // Upper right
                1.0, 1.0,

                // Upper left
                0.0, 1.0
            ];


        var indices = [
            0, 1, 2,
            0, 2, 3
        ];

        return buildGeometry(positions, indices, normals, tangents, textCoords);
    }

    function parseOBJ(objStr, genTextCoord, genNormal, genTangent) {

        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;

        var positions = [];
        var normals = null;
        if (genNormal)
            normals = [];
        var textCoords = null;
        if (genTextCoord)
            textCoords = [];


        function getIndex(i, data, componentsCount) {
            i = parseInt(i);
            //i is > or < 0
            return i > 0 ? (i - 1) * componentsCount : i + data.length / componentsCount;
        }

        function getPosIndex(i) {
            return getIndex(i, positions, 3);
        }

        function getNormalIndex(i) {
            return getIndex(i, normals, 3);
        }

        function getTextCoordIndex(i) {
            return getIndex(i, textCoords, 2);
        }


        function addFace(positions, normals, textCoords) {

            var posIndices = [];
            var normIndices = null;
            var textIndices = null;
            var i;

            var generateFace = null;

            //check if the face is a quad
            if (positions[3] !== undefined) {
                generateFace = (function () {

                    var p1 = positions[1],
                        p2 = positions[2],
                        p3 = positions[3];

                    //swap last element in the current face
                    positions[2] = positions[3];

                    if (normals != null) {
                        var n1 = normals[1],
                            n2 = normals[2],
                            n3 = normals[3];
                        normals[2] = normals[3];
                    }
                    if (textCoords != null) {
                        var t1 = textCoords[1],
                            t2 = textCoords[2],
                            t3 = textCoords[3];
                        textCoords[2] = textCoords[3];
                    }

                    return function () {

                        addFace(

                            [p1, p2, p3],

                            normals != null ? [n1, n2, n3] : null,

                            textCoords != null ? [t1, t2, t3] : null

                            );
                    }
                })();
            }

            for (i = 0 ; i < 3; i++)
                posIndices.push(getPosIndex(positions[i]));

            if (normals != null) {
                normIndices = [];
                for (i = 0 ; i < 3; i++)
                    normIndices.push(getNormalIndex(normals[i]));
            }

            if (textCoords != null) {
                textIndices = [];
                for (i = 0 ; i < 3; i++)
                    textIndices.push(getTextCoordIndex(textCoords[i]));
            }
                 
            if (faces == null) {
                //handle default material not specified
                faces = [];
                perMaterialFaces[''] = faces;
            }

            faces.push({
                posIndices: posIndices,
                normIndices: normIndices,
                textIndices: textIndices
            });

            if (generateFace != null)
                generateFace();

        }
        
        //Adapted from https://github.com/mrdoob/three.js/blob/master/examples/js/loaders/OBJLoader.js

        // v float float float
        var positionPattern = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
        // vn float float float
        var normalPattern = /vn( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
        // vt float float
        var textCoordPattern = /vt( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;
        // f posIndex posIndex posIndex posIndex
        var facePattern1 = /f( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)?/;
        // f posIndex/textIndex posIndex/textIndex posIndex/textIndex posIndex/textIndex
        var facePattern2 = /f( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))?/;
        // f posIndex/textIndex/normIndex posIndex/textIndex/normIndex posIndex/textIndex/normIndex posIndex/textIndex/normIndex
        var facePattern3 = /f( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))?/;
        // f posIndex//normIndex posIndex//normIndex posIndex//normIndex posIndex//normIndex
        var facePattern4 = /f( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))?/;
        // usemtl materialName
        var useMatPattern = /usemtl( +\S+)/;

        var lines = objStr.split('\n');
        var lineCount = lines.length;
        var i;
        var line;
        var result;

        var faces = null;
        var perMaterialFaces = {};

        for (i = 0; i < lineCount; i++) {
            line = lines[i];
            line.trim();

            //check empty string or comment command
            if (line.length === 0 || line.charAt(0) === '#')
                continue;
            else if ((result = positionPattern.exec(line)) != null)

                positions.push(
                    //x
                    parseFloat(result[1]),
                    //y
                    parseFloat(result[2]),
                    //z
                    parseFloat(result[3])
                );

            else if ((result = normalPattern.exec(line)) != null && normals != null)

                normals.push(
                    //x
                    parseFloat(result[1]),
                    //y
                    parseFloat(result[2]),
                    //z
                    parseFloat(result[3])
                );

            else if ((result = textCoordPattern.exec(line)) != null && textCoords != null)

                textCoords.push(
                    //u
                    parseFloat(result[1]),
                    //v
                    parseFloat(result[2])
                );

            else if ((result = facePattern1.exec(line)) != null) {

                // result == [ 'f i1 i2 i3 i4', i1, i2, i3, i4 ]
                addFace([result[1], result[2], result[3], result[4]], null, null);
            }
            else if ((result = facePattern2.exec(line)) != null) {
                // result == [ 'f i1/t1 i2/t2 i3/t3 i4/t4', i1/t1, i1, t1, i2/t2, i2, t2, .... ]
                addFace(

                    [result[2], result[5], result[8], result[11]],

                    null,

                    genTextCoord ? [result[3], result[6], result[9], result[12]] : null

                );

            }
            else if ((result = facePattern3.exec(line)) != null) {
                // result == [ 'f i1/t1/n1 i2/t2/n2 i3/t3/n3 i4/t4/n4', i1/t1/n1, i1, t1, n1, i2/t2/n2, i2, t2, n2, .... ]

                addFace(

                    [result[2], result[6], result[10], result[14]],

                    genNormal ? [result[4], result[8], result[12], result[16]] : null,

                    genTextCoord ? [result[3], result[7], result[11], result[15]] : null

                );

            } else if ((result = facePattern4.exec(line)) != null) {
                // result == [ 'f i1//n1 i2//n2 i3//n3 i4//n4', i1//n1, i1, n1, i2//n2, i2, n2, .... ]

                addFace(

                    [result[2], result[5], result[8], result[11]],

                    genNormal ? [result[3], result[6], result[9], result[12]] : null,

                    null

                );

            } else if ((result = useMatPattern.exec(line)) != null) {

                var materialName = result[1].trim();
                faces = [];
                perMaterialFaces[materialName] = faces;
            }else
                //needs future improvements
                continue;
        }


        var geometries = [];

        function addElement(dest, data, count) {
            for (var i = 0; i < count; i++)
                dest.push(data[i]);
        }

        function addPosition(position) {
            addElement(computedPositions, position, 3);
        }

        function addNormal(normal) {
            addElement(computedNormals, normal, 3);
        }

        function addTextCoord(textCoord) {
            addElement(computedTextCoords, textCoord, 2);
        }

        for (var materialName in perMaterialFaces) {

            var faces = perMaterialFaces[materialName];

            //at least one face should be provided
            var faceCount = faces.length;
            if (faceCount == 0)
                throw new Error('invalid source');


            var hasNormal = genNormal && faces[0].normIndices != null;
            var hasTextCoord = genTextCoord && faces[0].textIndices != null;

            //process faces        
            var computedPositions = [];
            var computedNormals = null;
            var computedTextCoords = null;

            if (hasNormal)
                computedNormals = [];
            if (hasTextCoord)
                computedTextCoords = [];

            var indices = [];
            var indexMap = {};
            var vertexCount = 0;

            

            var f;
            var j;
            var k;
            var index;
            var position = [];
            var normal = [];
            var textCoord = [];

            //for each face
            for (f = 0 ; f < faceCount; f++) {

                var face = faces[f];
                var posIndices = face.posIndices;
                var normIndices = face.normIndices;
                var textIndices = face.textIndices;

                //check consistency
                if ((hasNormal && normIndices == null) || (hasTextCoord && textIndices == null))
                    throw new Error('found inconsistency among faces');


                //for each vertex of the face
                for (i = 0; i < 3; i++) {

                    index = posIndices[i];

                    //get all 3 components
                    for (k = 0; k < 3; k++)
                        position[k] = positions[index + k];

                    if (hasNormal) {

                        index = normIndices[i];

                        //get all 3 components
                        for (k = 0; k < 3; k++)
                            normal[k] = normals[index + k];
                    }

                    if (hasTextCoord) {

                        index = textIndices[i];

                        //get all 2 components
                        for (k = 0; k < 2; k++)
                            textCoord[k] = textCoords[index + k];
                    }

                    //check if the vertex has already been added
                    var key = position.toString() + normal.toString() + textCoord.toString();
                    index = indexMap[key];

                    if (index == null) {

                        //add vertex entry
                        indexMap[key] = vertexCount;

                        //add index
                        indices.push(vertexCount);

                        vertexCount++;

                        //add vertex data
                        addPosition(position);

                        if (hasNormal)
                            addNormal(normal);
                        if (hasTextCoord)
                            addTextCoord(textCoord);

                    } else
                        indices.push(index);

                    //reset
                    for (k = 0; k < 3; k++) {
                        position.pop();
                        normal.pop();
                        textCoord.pop();
                    }
                }
            }

            var computedTangents = null;
            if (genTangent && computedTextCoords != null)
                computedTangents = generateTangents(computedPositions, computedTextCoords, indices);
            if (computedNormals == null && genNormal)
                computedNormals = generateNormals(computedPositions, indices);

            geometries.push({
                geometry: buildGeometry(computedPositions, indices, computedNormals, computedTangents, computedTextCoords),
                materialName: materialName
            });
        }
        return geometries;
    }

    function generateNormals(positions, indices) {

        var normalsMap = {};
        var indexCount = indices.length;

        var p1 = new VMath.Vector3();
        var p2 = new VMath.Vector3();
        var p3 = new VMath.Vector3();
                
        var triangleIndices = [];

        for (var i = 0; i < indexCount; i += 3) {

            //get triangle's vertices positions
            var i1 = indices[i];
            var i2 = indices[i + 1];
            var i3 = indices[i + 2];

            var posIndex = i1 * 3;
            p1.set(positions[posIndex], positions[posIndex + 1], positions[posIndex + 2]);

            var posIndex = i2 * 3;
            p2.set(positions[posIndex], positions[posIndex + 1], positions[posIndex + 2]);

            var posIndex = i3 * 3;
            p3.set(positions[posIndex], positions[posIndex + 1], positions[posIndex + 2]);
                        
            //p2 - p1
            p2.substract(p1);

            //p3 - p1
            p3.substract(p1);

            p2.cross(p3).normalize();

            triangleIndices[0] = i1;
            triangleIndices[1] = i2;
            triangleIndices[2] = i3;

            for (var k = 0; k < 3; k++) {
                var j = triangleIndices[k];
                var normal = normalsMap[j];
                if (normal == null) {
                    normal = new VMath.Vector3();
                    normalsMap[j] = normal;
                }
                normal.add(p2);                
            }
        }

        for (var key in normalsMap)
            normalsMap[key].normalize();

        var normals = new Array(positions.length);
        for (var i = 0 ; i < indexCount ; i++) {
            var index = indices[i];
            var normal = normalsMap[index];
            var normalIndex = index * 3;
            for (var j = 0; j < 3; j++)
                normals[normalIndex + j] = normal.data[j];
        }

        return normals;
    }

    /**
    *Adapted from 'Mathematics for 3D Game Programming and Computer Graphics' by Eric Lengyel 
    *(http://www.mathfor3dgameprogramming.com/)
    */
    function generateTangents(positions, textCoords, indices) {

        var tangentsMap = {};

        var indexCount = indices.length;

        var p1 = new VMath.Vector3();
        var p2 = new VMath.Vector3();
        var p3 = new VMath.Vector3();

        var uv1 = new VMath.Vector2();
        var uv2 = new VMath.Vector2();
        var uv3 = new VMath.Vector2();

        var v2_1 = new VMath.Vector2();
        
        var triangleIndices = [];

        for (var i = 0; i < indexCount; i+=3) {

            //get triangle's vertices positions and texture coordinates
            var i1 = indices[i];
            var i2 = indices[i + 1];
            var i3 = indices[i + 2];

            var posIndex = i1 * 3;
            p1.set(positions[posIndex], positions[posIndex + 1], positions[posIndex + 2]);

            var posIndex = i2 * 3;
            p2.set(positions[posIndex], positions[posIndex + 1], positions[posIndex + 2]);

            var posIndex = i3 * 3;
            p3.set(positions[posIndex], positions[posIndex + 1], positions[posIndex + 2]);
            
            var textCoordIndex = i1 * 2;
            uv1.set(textCoords[textCoordIndex], textCoords[textCoordIndex + 1]);

            var textCoordIndex = i2 * 2;
            uv2.set(textCoords[textCoordIndex], textCoords[textCoordIndex + 1]);

            var textCoordIndex = i3 * 2;
            uv3.set(textCoords[textCoordIndex], textCoords[textCoordIndex + 1]);
            
            /*
            * let T and B be the tanget and bitangent vector of the triangle, then in tangent space for any position Q  
            * with texture coordinates (u,v) inside the triangle it holds that : 
            * Q - Pi = (u - ui)*T + (v - vi)*B   where Pi is the position of any of the triangle's vertices and (ui, vi) its texture coordinates
            * Using p1 as Pi, p2 and p3 as Q :
            * p2 - p1 = (uv2.x - uv1.x) * T +  (uv2.y - uv1.y) * B
            * p3 - p1 = (uv3.x - uv1.x) * T +  (uv3.y - uv1.y) * B
            * this is a linear system with six unknowns and six equations :             
            *   u2 - u1   v2 - v1      Tx   Ty   Tz     p2x - p1x   p2y - p1y   p2z - p1z
            *                       *                =     
            *   u3 - u1   v3 - v1      Bx   By   Bz     p3x - p1x   p3y - p1y   p3z - p1z
            * 
            */

            //p2 - p1
            p2.substract(p1);

            //p3 - p1
            p3.substract(p1);

            //uv2 - uv1
            uv2.substract(uv1);

            //uv3 - uv1
            uv3.substract(uv1);
            
            /*
            * invert the coefficients matrix
            * a   b                d   -b   
            *        =  1.0/det *         
            * c   d               -c    a
            * 
            */

            // only the first row is required for the tangent
            v2_1.set(uv3.y, -uv2.y);
                                    
            var invDet = uv2.x * uv3.y - uv3.x * uv2.y;
            invDet = 1.0 / invDet;

            v2_1.scale(invDet);
            
            var tx = v2_1.x * p2.x + v2_1.y * p3.x;
            var ty = v2_1.x * p2.y + v2_1.y * p3.y;
            var tz = v2_1.x * p2.z + v2_1.y * p3.z;
            
            triangleIndices[0] = i1;
            triangleIndices[1] = i2;
            triangleIndices[2] = i3;

            for (var k = 0; k < 3; k++) {
                var j = triangleIndices[k];
                var tangent = tangentsMap[j];
                if (tangent == null) {
                    tangent = new VMath.Vector3();
                    tangentsMap[j] = tangent;
                }

                tangent.x += tx;
                tangent.y += ty;
                tangent.z += tz;
            }
        }

        for (var key in tangentsMap)
            tangentsMap[key].normalize();

        var tangents = new Array(positions.length);
        for (var i = 0 ; i < indexCount ; i++) {
            var index = indices[i];
            var tangent = tangentsMap[index];
            var tangentIndex = index * 3;
            for (var j = 0; j < 3; j++)
                tangents[tangentIndex + j] = tangent.data[j];
        }

        return tangents;
    }


    function checkWindingOrder(v1, v2, v3, n) {

        var e1 = VMath.Vector3.substract(v2, v1);
        var e2 = VMath.Vector3.substract(v3, v1);

        //face normal
        var v = VMath.Vector3.cross(e1, e2).normalize();

        return v.dot(n) > 0; 
    }

    function fromJSON(meshes, genTextCoord, genNormal, genTangent, skinned) {

        genNormal = genNormal == null ? false : genNormal;
        genTangent = genTangent == null ? false : genTangent;
        genTextCoord = genTextCoord == null ? false : genTextCoord;
        
        var meshBuffer = [];
        
        var tempPos = [new Array(3), new Array(3), new Array(3)];
        if(genNormal)
            var tempNorm = [new Array(3), new Array(3), new Array(3)];
        if(genTextCoord)
            var tempText = [new Array(2), new Array(2), new Array(2)];
        if (skinned) {
            var tempSkinInd = [[], [], []];
            var tempSkinW = [[], [], []];     
        }

        for (var i = 0, meshCount = meshes.length; i < meshCount ; i++) {
            var mesh = meshes[i];
            var positions = mesh.positions;
            var normals = mesh.normals;
            var textCoords = mesh.textCoords;
            var faces = mesh.faces;
            var skinIndices = mesh.skinIndices;
            var skinWeights = mesh.skinWeights;
            var influencesPerVertex = mesh.influencesPerVertex;
            
            var hasNormals = normals != null && normals.length > 0;
            var hasTextCoord = textCoords != null && textCoords.length > 0;
            var isSkinned = skinIndices != null && skinWeights != null && influencesPerVertex != null && skinned;

            var vertexCache = {};
            var currIndex = 0;
            var positionBuffer = [];
            var indexBuffer = [];

            if(hasNormals)
                var normalBuffer = [];
            if(hasTextCoord)
                var textCoordBuffer = [];
            if (isSkinned) {
                var skinIndBuffer = [];
                var skinWBuffer = [];                
            }

            for (var j = 0, faceCount = faces.length; j < faceCount; ) {
                var faceVertexCount = faces[j];

                if (faceVertexCount == 3) {

                    var p1 = faces[++j];
                    var p2 = faces[++j];
                    var p3 = faces[++j];

                    var n1 = null;
                    var n2 = null;
                    var n3 = null;

                    if (hasNormals) {
                        n1 = faces[++j];
                        n2 = faces[++j];
                        n3 = faces[++j];
                    }
                    
                    var t1 = null;
                    var t2 = null;
                    var t3 = null;

                    if (hasTextCoord) {
                        t1 = faces[++j];
                        t2 = faces[++j];
                        t3 = faces[++j];
                    }                  

                    addTriangleFace(p1, p2, p3, n1, n2, n3, t1, t2, t3);

                } else if (faceVertexCount == 4) {

                    //subdivide the quad in two triangles
                    var p1 = faces[++j];
                    var p2 = faces[++j];
                    var p3 = faces[++j];
                    var p4 = faces[++j];

                    var n1 = null;
                    var n2 = null;
                    var n3 = null;
                    var n4 = null;

                    if (hasNormals) {
                        n1 = faces[++j];
                        n2 = faces[++j];
                        n3 = faces[++j];
                        n4 = faces[++j];
                    }

                    var t1 = null;
                    var t2 = null;
                    var t3 = null;
                    var t4 = null;

                    if (hasTextCoord) {
                        t1 = faces[++j];
                        t2 = faces[++j];
                        t3 = faces[++j];
                        t4 = faces[++j];
                    }                                      
                    
                    addTriangleFace(p1, p2, p4, n1, n2, n4, t1, t2, t4);
                    addTriangleFace(p2, p3, p4, n2, n3, n4, t2, t3, t4);
                }

                j++;
            }
            
            var tangentBuffer = null;
            if (genNormal && !hasNormals)
                normalBuffer = generateNormals(positionBuffer, indexBuffer);
            if (genTangent && hasTextCoord)
                tangentBuffer = generateTangents(positionBuffer, textCoordBuffer, indexBuffer);

            meshBuffer.push(buildGeometry(positionBuffer, indexBuffer, normalBuffer, tangentBuffer, textCoordBuffer, skinIndBuffer, skinWBuffer));
        }

        return meshBuffer;

        function addTriangleFace(p1, p2, p3, n1, n2, n3, t1, t2, t3) {

            //check empty face
            if (p1 == p2 && p2 == p3)
                return;

            var pos1 = tempPos[0];
            var pos2 = tempPos[1];
            var pos3 = tempPos[2];

            getPosition(p1, pos1);
            getPosition(p2, pos2);
            getPosition(p3, pos3);
            
            var norm1 = null;
            var norm2 = null;
            var norm3 = null;

            if (hasNormals && genNormal) {
                norm1 = tempNorm[0];
                norm2 = tempNorm[1];
                norm3 = tempNorm[2];
                getNormal(n1, norm1);
                getNormal(n2, norm2);
                getNormal(n3, norm3);
            }

            var text1 = null;
            var text2 = null;
            var text3 = null;

            if (hasTextCoord && genTextCoord) {
                text1 = tempText[0];
                text2 = tempText[1];
                text3 = tempText[2];
                getTextCoord(t1, text1);
                getTextCoord(t2, text2);
                getTextCoord(t3, text3);
            }

            var skInd1 = null;
            var skInd2 = null;
            var skInd3 = null;

            var skW1 = null;
            var skW2 = null;
            var skW3 = null;

            if (isSkinned) {
                skInd1 = tempSkinInd[0];
                skInd2 = tempSkinInd[1];
                skInd3 = tempSkinInd[2];
                getSkinIndices(p1, skInd1);
                getSkinIndices(p2, skInd2);
                getSkinIndices(p3, skInd3);
                                
                skW1 = tempSkinW[0];
                skW2 = tempSkinW[1];
                skW3 = tempSkinW[2];
                getSkinWeights(p1, skW1);
                getSkinWeights(p2, skW2);
                getSkinWeights(p3, skW3);
            }
            
            //assumption if no normals are available
            var isCounterClockWise = true;

            if (hasNormals) {
                                
                //even if the normals are not generated, they can be used if available
                var aNormal = norm1;
                if (aNormal == null) {
                    aNormal = new Array(3);
                    getNormal(n1, aNormal);
                }

                //check winding order
                var v1 = new VMath.Vector3(pos1[0], pos1[1], pos1[2]);
                var v2 = new VMath.Vector3(pos2[0], pos2[1], pos2[2]);
                var v3 = new VMath.Vector3(pos3[0], pos3[1], pos3[2]);
                var n = new VMath.Vector3(aNormal[0], aNormal[1], aNormal[2]);

                isCounterClockWise = checkWindingOrder(v1, v2, v3, n);
            }  

            if (isCounterClockWise) {
                //counter-clockwise
                addVertex(pos1, norm1, text1, skInd1, skW1);
                addVertex(pos2, norm2, text2, skInd2, skW2);
                addVertex(pos3, norm3, text3, skInd3, skW3);
            } else {
                //reverse vertices order
                addVertex(pos1, norm1, text1, skInd1, skW1);
                addVertex(pos3, norm3, text3, skInd3, skW3);
                addVertex(pos2, norm2, text2, skInd2, skW2);
            }
        }

        function getPosition(p, dest) {
            dest[0] = positions[p * 3];
            dest[1] = positions[p * 3 + 1];
            dest[2] = positions[p * 3 + 2];
        }

        function getNormal(n, dest) {
            dest[0] = normals[n * 3];
            dest[1] = normals[n * 3 + 1];
            dest[2] = normals[n * 3 + 2];
        }

        function getTextCoord(t, dest) {
            dest[0] = textCoords[t * 2];
            dest[1] = textCoords[t * 2 + 1];
        }

        function getSkinIndices(p, dest) {
            for (var i = 0 ; i < influencesPerVertex; i++) 
                dest[i] = skinIndices[p * influencesPerVertex + i];
        }

        function getSkinWeights(p, dest) {
            for (var i = 0 ; i < influencesPerVertex; i++)
                dest[i] = skinWeights[p * influencesPerVertex + i];            
        }

        function addVertex(pos, norm, text, skI, skW) {

            var vertexKey = pos.toString();

            if (norm != null)
                vertexKey += norm.toString();
            if (text != null)
                vertexKey += text.toString();
            if (skinned){
                vertexKey += skI.toString();
                vertexKey += skW.toString();
            }               

            var index = vertexCache[vertexKey];

            if(index != null){
                indexBuffer.push(index);
                return;
            }

            vertexCache[vertexKey] = currIndex;
            indexBuffer.push(currIndex);

            var posIndex = currIndex * 3;
            var normIndex = posIndex;
            var textIndex = currIndex * 2;

            for (var i = 0 ; i < 3; i++) {
                positionBuffer[posIndex + i] = pos[i];
                if (norm != null)
                    normalBuffer[normIndex + i] = norm[i];
                if (i < 2 && text != null)
                    textCoordBuffer[textIndex + i] = text[i];
            }

            if (skinned) {

                normalizeSkinWeights(skW, influencesPerVertex);
                
                var skinIndex = currIndex * influencesPerVertex;
                for (var i = 0 ; i < influencesPerVertex; i++) {
                    skinIndBuffer[skinIndex + i] = skI[i];
                    skinWBuffer[skinIndex + i] = skW[i];
                }
                
            }

            currIndex++;
        }

    }

    function normalizeSkinWeights(weights, count) {
        var sum = 0.0;
        for (var i = 0 ; i < count ; i++)
            sum += weights[i];
        sum = 1.0 / sum;
        for (var i = 0 ; i < count ; i++)
            weights[i] *= sum;
    }
        
    
    function GeometryGenerator(parameters) {

        var positionAttribute;
        var normalAttribute;
        var textCoordAttribute;
        var tangentAttribute;
        var skinIndicesAttribute;
        var skinWeightsAttribute;

        var genNormals;
        var genTextCoords;
        var genTangents;
        var genSkin;

        if (parameters != null) {
            positionAttribute = parameters.positionAttribute;
            normalAttribute = parameters.normalAttribute;
            textCoordAttribute = parameters.textCoordAttribute;
            tangentAttribute = parameters.tangentAttribute;
            skinIndicesAttribute = parameters.skinIndicesAttribute;
            skinWeightsAttribute = parameters.skinWeightsAttribute;
            genNormals = parameters.genNormals;
            genTextCoords = parameters.genTextCoords;
            genTangents = parameters.genTangents;
            genSkin = parameters.genSkin;
        }
        
        positionAttribute = positionAttribute != null ? positionAttribute : defaultPositionAttribute;
        normalAttribute = normalAttribute != null ? normalAttribute : defaultNormalAttribute;
        textCoordAttribute = textCoordAttribute != null ? textCoordAttribute : defaultTextCoordAttribute;
        tangentAttribute = tangentAttribute != null ? tangentAttribute : defaultTangentAttribute;
        skinIndicesAttribute = skinIndicesAttribute != null ? skinIndicesAttribute : defaultSkinIndicesAttribute;
        skinWeightsAttribute = skinWeightsAttribute != null ? skinWeightsAttribute : defaultSkinWeightsAttribute;

        genNormals = genNormals != null ? genNormals : false;
        genTextCoords = genTextCoords != null ? genTextCoords : false;
        genTangents = genTangents != null ? genTangents : false;
        genSkin = genSkin != null ? genSkin : false;
                       
        Object.defineProperties(this, {

            boxGeometry: {
                value: function (width, height, depth) {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    var geom = boxGeometry(width, height, depth, genTextCoords, genNormals, genTangents);
                    setDefaultAttributes();
                    return geom;
                }
            },

            sphereGeometry: {
                value: function (radius, sliceCount, stackCount) {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    var geom = sphereGeometry(radius, sliceCount, stackCount, genTextCoords, genNormals, genTangents);
                    setDefaultAttributes();
                    return geom;
                }
            },

            cilynderGeometry: {
                value: function (bottomRadius, topRadius, height, sliceCount, stackCount) {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    var geom = cilynderGeometry(bottomRadius, topRadius, height, sliceCount, stackCount, genTextCoords, genNormals, genTangents);
                    setDefaultAttributes();
                    return geom;
                }
            },

            quadGeometry: {
                value: function () {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    var geom = cilynderGeometry(bottomRadius, topRadius, height, sliceCount, stackCount, genTextCoords, genNormals, genTangents);
                    setDefaultAttributes();
                    return geom;
                }                
            },

            gridGeometry: {
                value: function (width, depth, m, n) {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    var geom = gridGeometry(width, depth, m, n, genTextCoords, genNormals, genTangents);
                    setDefaultAttributes();
                    return geom;
                }
            },

            parseOBJ: {
                value: function (objStr) {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    var geom = parseOBJ(objStr, genTextCoords, genNormals, genTangents);
                    setDefaultAttributes();
                    return geom;
                }
            },

            fromJSON: {
                value: function (json) {
                    setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute);
                    setSkinningAttributes(skinIndicesAttribute, skinWeightsAttribute);
                    var geom = fromJSON(jsonObj, genTextCoords, genNormals, genTangents, genSkin);
                    setDefaultAttributes();
                    return geom;
                }
            }
        });
    }

    GeometryGenerator.prototype = {};
    Object.defineProperty(GeometryGenerator.prototype,'constructor',{ value: GeometryGenerator });

    
    Object.defineProperties(GeometryGenerator, {       

        boxGeometry: { value: boxGeometry },
                
        sphereGeometry: { value: sphereGeometry },

        cilynderGeometry: { value: cilynderGeometry },

        quadGeometry: { value: quadGeometry },

        gridGeometry: { value: gridGeometry },

        parseOBJ: { value: parseOBJ },

        fromJSON: { value: fromJSON }                
    });
    
    function setSimpleAttributes(positionAttribute, normalAttribute, textCoordAttribute, tangentAttribute) {
        currPositionAttribute = positionAttribute;
        currNormalAttribute = normalAttribute;
        currTextCoordAttribute = textCoordAttribute;
        currTangentAttribute = tangentAttribute;
    }

    function setSkinningAttributes(skinIndicesAttribute, skinWeightsAttribute) {
        currSkinIndicesAttribute = skinIndicesAttribute;
        currSkinWeightsAttribute = skinWeightsAttribute;
    }    

    
    return GeometryGenerator;

});