define(['Utils', './DataType', './EventTarget', './IDObject', './Pools'],

    function (Utils, DataType, EventTarget, IDObject, Pools) {
        
        'use strict';

        function VertexLayout() {

            IDObject.call(this);

            var attributesDescriptors = [];
            var vertexStride = 0;

            Object.defineProperties(this, {
                                
                attributeDescsCount : {
                    get: function () {
                        return attributesDescriptors.length;
                    }
                },

                getAttributeDesc : {
                    value: function (index) {
                        return attributesDescriptors[index];
                    }
                },

                getAttributeDescByName : {
                    value: function (name) {
                        return attributesDescriptors[name];
                    }
                },

                vertexStride: {
                    get: function () {
                        return vertexStride;
                    }
                },

                addAttributeDesc: {
                    value: function (name, componentsCount, componentType) {
                        
                        var componentSize = Utils.getSizeByType(componentType);
                        var attrStride = componentSize * componentsCount;

                        var desc = {
                            name: name,
                            componentsCount: componentsCount,
                            componentType: componentType,
                            componentSize: componentSize,
                            offset: vertexStride,
                            stride: attrStride
                        };

                        attributesDescriptors.push(desc);
                        attributesDescriptors[name] = desc;

                        vertexStride = vertexStride + attrStride;
                    }
                }
            });
        }

        VertexLayout.prototype = Object.create(IDObject.prototype);
        Object.defineProperties(VertexLayout.prototype, {
            constructor: { value: VertexLayout },
            clone: {
                value: function () {
                    var vertexLayout = new VertexLayout();
                    var attributesDescCount = this.attributeDescsCount;
                    for (var i = 0; i < attributesDescCount; i++) {
                        var desc = this.getAttributeDesc(i);
                        vertexLayout.addAttributeDesc(desc.name, desc.componentsCount, desc.componentType);
                    }
                    return vertexLayout;
                }
            }
        });

        var BufferType = Object.freeze({
            VertexBuffer: 0,
            IndexBuffer : 1
        });

        var Usage = Object.freeze({
            STATIC: 0,
            DYNAMIC: 1
        });
        
        var dataChangedEvent = 'dataChanged';
        var changedEvent = 'changed';
        var releasedEvent = 'released';

        function Buffer(usage) {

            EventTarget.call(this);

            usage = usage != null ? usage : Usage.STATIC;
            
            Object.defineProperties(this, {

                usage: {
                    value: usage,
                    configurable: true
                }
            });
        }

        Buffer.prototype = Object.create(EventTarget.prototype);
        Object.defineProperty(Buffer.prototype, 'constructor', { value: Buffer });
                
        function VertexBuffer(vertexLayout, dataMap, vertexCount, usage, build, keepDataMap) {
                        
            Buffer.call(this, usage);

            build = build != null ? build : true;            
            keepDataMap = keepDataMap != null ? keepDataMap : true;
            
            var data = null;
            var released = false;
            
            Object.defineProperties(this, {

                data: {
                    get: function () {
                        return data;
                    },

                    set: function (v) {
                        data = v; 
                        this.trigger(dataChangedEvent);
                    },
                    configurable : true
                },

                vertexLayout: {

                    get: function () {
                        return vertexLayout
                    },

                    set: function (v) {
                        vertexLayout = v;
                    },
                    configurable : true
                },

                vertexCount: {

                    get: function () {
                        return vertexCount;
                    },

                    set: function (v) {                        
                        vertexCount = v;
                        //this.trigger(dataChangedEvent);
                    },
                    configurable : true
                },

                build: {
                    value: function (keep) {

                        if (dataMap == null)
                            throw new Error('no data provided');
                        
                        data = buildBuffer(vertexLayout, dataMap, vertexCount);
                        this.trigger(dataChangedEvent);

                        if (keep != null)
                            keepDataMap = keep;

                        if (!keepDataMap)
                            dataMap = null;
                    },
                    configurable : true
                },

                update: {
                    // offsets are in vertex unit, counts are the number of vertices
                    value: function (attributes, offsets, counts) {
                        
                        if (!(attributes instanceof Array)) 
                            attributes = [attributes];                            
                        
                        if (!(offsets instanceof Array))
                            offsets = [offsets];

                        if (!(counts instanceof Array))
                            counts = [counts];
                        
                        updateAttributeData(data, vertexLayout, dataMap, vertexCount, attributes, offsets, counts);
                        this.trigger(dataChangedEvent);
                    },
                    configurable : true
                },
                
                dataMap: {
                    get: function () {
                        return dataMap;
                    },

                    set: function (v) {
                        dataMap = v;
                    },
                    configurable : true
                },

                release: {
                    value: function () {
                        if (released)
                            return;
                        released = true;
                        this.trigger(releasedEvent);
                        dataMap = null;
                        data = null;
                        vertexLayout = null;                        
                        vertexBufferPool.release(this);
                    },
                    configurable : true
                }
            });

            if (build)
                this.build();
        }

        VertexBuffer.prototype = Object.create(Buffer.prototype);
        Object.defineProperties(VertexBuffer.prototype, {

            constructor: { value: VertexBuffer },

            type: {
                value: BufferType.VertexBuffer
            },

            clone: {
                value: function () {
                    var dataMap = this.dataMap;
                    var build = false;
                    if (dataMap != null)
                        build = true;
                    return vertexBufferPool.get(this.vertexLayout.clone(), dataMap, this.vertexCount, this.usage, build, true);
                }
            }
        }); 
        
        function buildBuffer(vertexLayout, dataMap, vertexCount) {
            
            //allocate buffer
            var vertexStride = vertexLayout.vertexStride;            
            var buffer = new ArrayBuffer(vertexCount * vertexStride);
            var dataView = new DataView(buffer);
            
            //write attributes' data at relative offsets according to their type
            var attributesCount = vertexLayout.attributeDescsCount;
            for (var i = 0; i < attributesCount; i++) {

                var attributeDesc = vertexLayout.getAttributeDesc(i);

                //check missing data
                var data = dataMap[attributeDesc.name];
                if (data == null)
                    throw new Error('missing attribute data : ' + attributeDesc.name);

                writeAttributeValues(dataView, data, 0, vertexCount, attributeDesc, vertexStride);
            }

            return buffer;
        }

        function writeAttributeValues(dataView, data, dataOffset, vertexCount, attributeDesc, vertexStride) {

            var componentsCount = attributeDesc.componentsCount;
            var componentType = attributeDesc.componentType;
            var componentSize = attributeDesc.componentSize;
            var offset = attributeDesc.offset;

            for (var j = 0; j < vertexCount; j++) {

                for (var k = 0; k < componentsCount; k++)
                    writeValueByType(componentType, dataView, data[dataOffset + j * componentsCount + k], offset + k * componentSize);

                //update byte offset to the next vertex data
                offset += vertexStride;
            }
        }

        function writeValueByType(type, dataView, value, offset) {
            switch (type) {
                case DataType.BYTE:
                    dataView.setInt8(offset, value);
                    break;
                case DataType.SHORT:
                    dataView.setInt16(offset, value, Utils.littleEndianess);
                    break;
                case DataType.UNSIGNED_BYTE:
                    dataView.setUint8(offset, value);
                    break;
                case DataType.UNSIGNED_SHORT:
                    dataView.setUint16(offset, value, Utils.littleEndianess);
                    break;
                case DataType.FLOAT:
                    dataView.setFloat32(offset, value, Utils.littleEndianess);
                    break;
            }
        }
                
        function updateAttributeData(buffer, vertexLayout, dataMap, vertexCount, attributes, offsets, counts) {
                        
            var attributesCount = attributes.length;                        
            var vertexStride = vertexLayout.vertexStride;
            
            for (var i = 0; i < attributesCount; i++) {

                var attribute = attributes[i];

                var attributeDesc = vertexLayout.getAttributeDescByName(attribute);
                var data = dataMap[attribute];

                if (attributeDesc == null || data == null)
                    throw new Error('invalid attribute');

                var offset = offsets[i];
                var count = counts[i];

                //handle default
                if (offset == null)
                    offset = 0;
                if (count == null)
                    count = vertexCount;

                if (offset + count > vertexCount)
                    throw new Error('invalid range');

                var dataView = new DataView(buffer, offset * vertexStride);

                writeAttributeValues(dataView, data, offset * attributeDesc.componentsCount, count, attributeDesc, vertexStride);
            }         
        }
        
        function IndexBuffer(data, indexType, usage) {
            
            Buffer.call(this, usage);

            indexType = indexType != null ? indexType : DataType.UNSIGNED_SHORT;
            var indexCount = data != null ? data.length : 0;
            var released = false;

            Object.defineProperties(this, {

                data: {
                    get: function () {
                        return data;
                    },

                    set: function (v) {                        
                        data = v;
                        if (data != null)
                            indexCount = data.length;
                        this.trigger(dataChangedEvent);
                    },
                    configurable : true
                },

                indexCount: {
                    get: function () {
                        return indexCount;
                    },
                    set : function(v){
                        indexCount = v;
                        //this.trigger(dataChangedEvent);
                    },
                    configurable : true
                },

                indexType: {
                    get: function () {
                        return indexType;
                    },

                    set: function (v) {
                        indexType = v;
                        this.trigger(dataChangedEvent);
                    },
                    configurable : true
                },
                release: {
                    value: function(){
                        if (released)
                            return;
                        released = true;
                        this.trigger(releasedEvent);
                        data = null;                        
                        indexBufferPool.release(this);
                    },
                    configurable : true
                }

            });
        }

        IndexBuffer.prototype = Object.create(Buffer.prototype);
        Object.defineProperties(IndexBuffer.prototype, {
            
            constructor: { value: IndexBuffer },

            type: {
                value : BufferType.IndexBuffer
            },

            clone: {
                value: function () {
                    return indexBufferPool.get(this.data,this.indexType, this.usage);
                }
            }
        });

        var vertexBufferPool = Pools.createObjectPool(VertexBuffer, false);
        var indexBufferPool = Pools.createObjectPool(IndexBuffer, false);

        return Object.freeze({
            
            VertexLayout: VertexLayout,
            Usage : Usage,
            BufferType: BufferType,

            createVertexBuffer: function (vertexLayout, dataMap, vertexCount, usage, build, instanceData, keepDataMap) {
                return vertexBufferPool.get(vertexLayout, dataMap, vertexCount, usage, build, instanceData, keepDataMap);
            },

            createIndexBuffer: function (data, indexType, usage) {
                return indexBufferPool.get(data, indexType, usage);
            }
        });

    });