define(function(){
        
    function CullingApp(SGE, DemoUtils) {

        return function (gui) {

            'use strict';

            var imageFolder = 'Textures/';

            var images = [
                'crate.gif',
                'william_wall_01_D.png',
                'WoodFine0039_1_S.jpg',
                'rustytiles01_diff.png',
                'RockSmoothErosion0026_1_S.jpg',
                'Fiberglass0009_S.jpg'
            ];

            images.forEach(DemoUtils.addFileFolder(imageFolder));

            var skyBox;
            var camera;
            var texturesCount = images.length;
            var textures = [];


            Object.defineProperties(this, {

                onLoadResources: {
                    value: function (loadRequests) {
                        for (var i = 0 ; i < images.length; i++)
                            loadRequests.images.push(images[i]);
                    }
                },

                onResourceLoaded: {
                    value: function (loadedImages) {
                        for (var i = 0; i < texturesCount; i++)
                            textures[i] = SGE.createTexture(loadedImages[i]);
                    }
                },

                createScene: {
                    value: function (scene) {

                        camera = new SGE.Camera({ isPerspective: true, fovY: Math.PI * 0.25, near: 0.1, far: 500.0 });

                        var cameraObject = new SGE.Object3D();
                        cameraObject.addComponent(camera);
                        scene.add(cameraObject);
                        cameraObject.transformComponent.z = 30.0;
                        cameraObject.transformComponent.x = 30.0;
                        cameraObject.transformComponent.lookAt(new SGE.Vector3());
                        cameraObject.addComponent(new DemoUtils.FPSMove(1.0));
                        cameraObject.addComponent(new DemoUtils.FreeView());

                        gui = gui != null ? gui :  new dat.GUI();
                        gui.add(camera, 'cullType', { enabled: SGE.CullType.ENABLED, disabled: SGE.CullType.DISABLED }).name('Frustum culling');

                        var materialsCount = 20;
                        var materials = [];
                        var box = SGE.GeometryGenerator.boxGeometry(1.0, 1.0, 1.0, true);
                        for (var i = 0; i < materialsCount; i++) {
                            if (Math.random() < 0.5) {
                                var color = SGE.Vector4.random();
                                color.w = 1.0;
                                materials[i] = SGE.makeMaterial({ color: color });
                            } else {
                                var textIndex = Math.floor(Math.random() * texturesCount);
                                materials[i] = SGE.makeMaterial({ colorMap: textures[textIndex] });
                            }
                        }

                        var size = 15.0;
                        function getTarget() {
                            return new SGE.Vector3().random((Math.random() * size - 1) + 1);
                        }

                        var boxes = [];

                        function addBox(count) {
                            for (var i = 0; i < count; i++) {
                                var matIndex = Math.floor(Math.random() * materialsCount);
                                var obj = new SGE.Object3D();
                                obj.addComponent(new SGE.MeshRendererComponent(box, materials[matIndex]));
                                obj.addComponent(new DemoUtils.RandomNavigationComponent(getTarget, 4.0));
                                scene.add(obj);
                                boxes.push(obj);
                            }
                        }

                        var state = {
                            boxCount: 0,
                            addRatio: 10,
                            addBox: function () {
                                var addRatio = this.addRatio;
                                addBox(addRatio);
                                this.boxCount += addRatio;
                                boxCountController.updateDisplay();
                            }
                        };

                        gui.add(state, 'addBox');
                        gui.add(state, 'addRatio');
                        var boxCountController = gui.add(state, 'boxCount', 0).onChange(function (value) {
                            var currBoxCount = boxes.length;
                            var removeCount = currBoxCount - value;
                            if (removeCount < 0)
                                addBox(-removeCount);
                            else if (removeCount > 0) {
                                for (var i = 0; i < removeCount; i++)
                                    scene.remove(boxes[i]);
                                boxes.splice(0, removeCount);
                            }
                        });

                        state.addBox();
                        return scene;
                    }
                },

                onResize: {
                    value: function (width, height) {
                        camera.aspectRatio = width / height;
                    }
                }
            });
        };
    }    

    return {
        CullingApp : CullingApp
    };
});