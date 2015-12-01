define(['SGE', 'libs/jquery', './spin'], function (SGE, $, Spinner) {
    
    function DemoInit(appFun) {

        var body = document.body;
        $(body).css({ margin: 0, padding: 0, overflow: 'hidden'});
    
        var container = $('<div>', { id: 'loading' }).css({ width: '100%', height: '100%', margin: 0, padding: 0 });
        var spinner = new Spinner().spin(container.get(0));
        $(body).append(container);
        
        var spinning = true;

        function DemoApp() {
            SGE.Application.call(this);

            Object.defineProperties(this, {
                                
                onStart: {
                    value: function () {                        
                        $(container).fadeOut('slow', function () {
                            spinner.stop();
                        });
                        spinning = false;
                    },
                    configurable : true
                },

                onPause: {
                    value: function () {                        
                        spinner.spin(container.get(0));
                        $(container).fadeIn('slow');
                        spinning = true;
                    },
                    configurable: true
                },

                onStop: {
                    value: function (error) {
                        if (spinning) {
                            spinning = false;
                            spinner.stop();
                        }
                        var errorElement = $('<p>').append($('<b>', { text: 'Something went wrong!' }));
                        $(errorElement).append($('<p>', {text : error}));
                        $(container).append(errorElement);
                        $(container).fadeIn('fast');
                    },
                    configurable: true
                }
            });

            appFun.apply(this, arguments);
        }

        DemoApp.prototype = Object.create(SGE.Application.prototype);
        Object.defineProperty(DemoApp.prototype, 'constructor', { value: DemoApp });
        return DemoApp;
    }

    function addFileFolder(folder) {

        return function (v, i, a) {
            if (!(v instanceof Array))
                a[i] = folder + v;
        };
    }
    
    function SphereView(origin, minRadius, maxRadius, startRadius, radiusStep, degPerPixel, radiusStepPerPixel, domElement) {
        SGE.BehaviorComponent.call(this);

        origin = origin == null ? new SGE.Vector3() : SGE.Vector3.fromVector3(origin);

        var ox = origin.x;
        var oy = origin.y;
        var oz = origin.z;

        if (minRadius == null)
            minRadius = 0.1;
        if (maxRadius == null)
            maxRadius = Number.MAX_VALUE;
        if (startRadius == null)
            startRadius = 25.0;

        minRadius = Math.min(minRadius, maxRadius);
        
        degPerPixel = degPerPixel != null ? degPerPixel : 0.25;
        radiusStepPerPixel = radiusStepPerPixel != null ? radiusStepPerPixel : 0.25;
        domElement = domElement != null ? domElement : document.body;
        var mouseLeftDown = false;
        var mouseRightDown = false;
        var lastMousePos = new SGE.Vector2();
        var pos = new SGE.Vector2();

        var theta = 0.0;
        var phi = Math.PI * 0.5;
        var radius = Math.min(startRadius, maxRadius);

        var needsUpdate = true;

        function mouseDownListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            var which = evt.which;

            if (which == 2 || mouseLeftDown || mouseRightDown)
                return;
                        
            lastMousePos.set(evt.pageX, evt.pageY);

            if (which == 1)
                mouseLeftDown = true;
            else
                mouseRightDown = true;
        }

        function mouseUpListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            var which = evt.which;

            if (which == 2)
                return;
            else if (which == 1)
                mouseLeftDown = false;
            else if (which == 3)
                mouseRightDown = false;
        }

        var _this = this;

        function mouseMoveListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            if (!mouseLeftDown && !mouseRightDown)
                return;
                        
            var x = evt.pageX;
            var y = evt.pageY;

            pos.set(x, y);

            var diffX = x - lastMousePos.x;
            var diffY = y - lastMousePos.y;
            lastMousePos.set(x, y);

            if (mouseLeftDown) {
                var dx = SGE.Utils.degToRadian(diffX * degPerPixel);
                var dy = SGE.Utils.degToRadian(diffY * degPerPixel);

                _this.theta += dx;
                _this.phi += dy;
            }
                
            if (mouseRightDown) 
                _this.radius += radiusStep * diffX * radiusStepPerPixel;            
        }

        var forwardKeyCode = 'W';
        var backKeyCode = 'S';

        forwardKeyCode = forwardKeyCode.charCodeAt(0);
        backKeyCode = backKeyCode.charCodeAt(0);
        radiusStep = radiusStep != null ? radiusStep : 1.0;

        function keyDownListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            switch (evt.which) {
                case forwardKeyCode:
                    _this.radius -= radiusStep;
                    break;
                case backKeyCode:
                    _this.radius += radiusStep;
                    break;
                default:
                    return;
            }                       
        }

        function disableContextMenu(e) {
            e.preventDefault();
        }

        var transformComponent;

        Object.defineProperties(this, {

            onActivated: {
                value: function () {                    
                    $(domElement).mousedown(mouseDownListener);
                    $(domElement).mouseup(mouseUpListener);
                    $(domElement).mousemove(mouseMoveListener);
                    $(domElement).keydown(keyDownListener);
                    $(domElement).on('contextmenu', disableContextMenu);
                    transformComponent = this.object3D.transformComponent;
                }
            },

            onDeactivated: {
                value: function () {
                    transformComponent = null;
                    $(domElement).off('mousedown', mouseDownListener);
                    $(domElement).off('mouseup', mouseUpListener);
                    $(domElement).off('mousemove', mouseMoveListener);
                    $(domElement).off('keydown', keyDownListener);
                    $(domElement).off('contextmenu', disableContextMenu);
                }
            },

            origin: {
                get: function () {
                    return origin;
                },
                set: function (v) {
                    if (v != origin)
                        origin.fromVector3(v);
                    ox = origin.x;
                    oy = origin.y;
                    oz = origin.z;
                    needsUpdate = true;
                }
            },

            radius: {
                get: function () {
                    return radius;
                },
                set: function (v) {
                    radius = v;
                    radius = Math.max(radius, minRadius);
                    radius = Math.min(radius, maxRadius);
                    needsUpdate = true;
                }
            },

            phi: {
                get: function () {
                    return phi;
                },
                set: function (v) {
                    phi = v;
                    phi = Math.min(phi, Math.PI - 0.1);
                    phi = Math.max(phi, 0.1);
                    needsUpdate = true;
                }
            },

            theta: {
                get: function () {
                    return theta;
                },
                set: function (v) {
                    theta = v;
                    needsUpdate = true;
                }

            },

            update: {
                value: function (dt) {

                    if (!needsUpdate)
                        return;

                    var x = ox + radius * Math.sin(phi) * Math.cos(theta);
                    var z = oz + radius * Math.sin(phi) * Math.sin(theta);
                    var y = oy + radius * Math.cos(phi);

                    transformComponent.position = transformComponent.position.set(x, y, z);
                    transformComponent.lookAt(origin);

                    needsUpdate = false;
                }
            }

        });
    }

    SphereView.prototype = Object.create(SGE.BehaviorComponent.prototype);
    Object.defineProperty(SphereView.prototype, 'constructor', { value: SphereView });

    function FreeView(degPerPixel, domElement) {
        SGE.BehaviorComponent.call(this);

        degPerPixel = degPerPixel != null ? degPerPixel : 0.25;
        domElement = domElement != null ? domElement : document.body;
        var mouseDown = false;
        var lastMousePos = null;

        var pos = new SGE.Vector2();

        var dx = 0.0;
        var dy = 0.0;
        var needsUpdate = true;

        function mouseDownListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            if (evt.which == 1)
                mouseDown = true;
        }

        function mouseUpListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            if (evt.which == 1)
                mouseDown = false;
        }

        function mouseMoveListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            if (lastMousePos == null)
                lastMousePos = new SGE.Vector2(evt.pageX, evt.pageY);

            pos.set(evt.pageX, evt.pageY);

            var diffX = pos.x - lastMousePos.x;
            var diffY = pos.y - lastMousePos.y;
            lastMousePos.set(pos.x, pos.y);

            if (!mouseDown)
                return;

            dx += SGE.Utils.degToRadian(diffX * degPerPixel);
            dy += SGE.Utils.degToRadian(diffY * degPerPixel);

            needsUpdate = true;
        }

        var transformComponent;
        var yAxis = SGE.VMath.yAxis;

        Object.defineProperties(this, {

            onActivated: {
                value: function () {
                    $(domElement).mousedown(mouseDownListener);
                    $(domElement).mouseup(mouseUpListener);
                    $(domElement).mousemove(mouseMoveListener);
                    transformComponent = this.object3D.transformComponent;
                }
            },

            onDeactivated: {
                value: function () {
                    transformComponent = null;
                    $(domElement).off('mousedown', mouseDownListener);
                    $(domElement).off('mouseup', mouseUpListener);
                    $(domElement).off('mousemove', mouseMoveListener);
                }
            },

            update: {
                value: function (dt) {

                    if (!needsUpdate)
                        return;

                    //the angle increases as the view goes up, in screen coordinates as y decreases
                    transformComponent.rotateAboutAxis(transformComponent.right, -dy);

                    //the angle increases as the view goes right, in screen coordinates as x decreases
                    transformComponent.rotateAboutAxis(yAxis, -dx);

                    needsUpdate = false;
                    dx = 0.0;
                    dy = 0.0;
                }
            }

        });
    }

    FreeView.prototype = Object.create(SGE.BehaviorComponent.prototype);
    Object.defineProperty(FreeView.prototype, 'constructor', { value: FreeView });
        
    function FPSMove(step, domElement) {        
        SGE.BehaviorComponent.call(this);

        step = step != null ? step : 1.0;
        domElement = domElement != null ? domElement : document.body;
        var forwardKeyCode = 'W';
        var backKeyCode = 'S';
        var leftKeyCode = 'A';
        var rightKeyCode = 'D';

        forwardKeyCode = forwardKeyCode.charCodeAt(0);
        backKeyCode = backKeyCode.charCodeAt(0);
        leftKeyCode = leftKeyCode.charCodeAt(0);
        rightKeyCode = rightKeyCode.charCodeAt(0);

        var needsUpdate = true;

        function keyDownListener(evt) {
            if (evt.isDefaultPrevented())
                return;

            switch (evt.which) {
                case forwardKeyCode:
                    goForward = true;
                    break;
                case backKeyCode:
                    goBack = true;
                    break;
                case leftKeyCode:
                    goLeft = true;
                    break;
                case rightKeyCode:
                    goRight = true;
                    break;
                default:
                    return;                    
            }
            needsUpdate = true;
        }

        var transformComponent;
        var goForward = false;
        var goBack = false;
        var goLeft = false;
        var goRight = false;

        
        
        Object.defineProperties(this, {

            onActivated: {
                value: function () {
                    $(domElement).keydown(keyDownListener);
                    transformComponent = this.object3D.transformComponent;
                }
            },

            onDeactivated: {
                value: function () {
                    transformComponent = null;
                    $(domElement).off('keydown', keyDownListener);
                }
            },

            update: {
                value: (function () {

                    var dir = new SGE.Vector3();
                    var up = new SGE.Vector3();
                        
                    return function (dt) {
                                                        
                        if (!needsUpdate)
                            return;
                        needsUpdate = false;
                                                       
                        var s = step;

                        if (goForward || goBack) {

                            dir.fromVector3(transformComponent.forward);
                            if (goBack)
                                s = -s;

                            goForward = false;
                            goBack = false;

                        } else if (goLeft || goRight) {

                            dir.fromVector3(transformComponent.right);
                            if (goLeft)
                                s = -s;

                            goLeft = false;
                            goRight = false;
                        }

                        var pos = transformComponent.position;
                            
                        up.set(0.0, 1.0, 0.0);
                        dir.substract(up.scale(SGE.Vector3.dot(dir, up)));
                        pos.scaleAndAdd(dir, s);
                                                                                
                        transformComponent.position = pos;
                    };

                })()
            }
        });
    }

    FPSMove.prototype = Object.create(SGE.BehaviorComponent.prototype);
    Object.defineProperty(FPSMove.prototype, 'constructor', { value: FPSMove });

    function BoxConstrainer(minX, maxX, minY, maxY, minZ, maxZ) {
        SGE.BehaviorComponent.call(this);

        var transformComponent;
        var needsUpdate = true;
        
        function positionChangedListener() {
            needsUpdate = true;
        }

        Object.defineProperties(this, {

            onActivated: {
                value: function () {
                    transformComponent = this.object3D.transformComponent;
                    transformComponent.addEventListener('positionChanged', positionChangedListener);
                }
            },

            onDeactivated: {
                value: function () {
                    transformComponent.removeEventListener('positionChanged', positionChangedListener);
                    transformComponent = null;
                }
            },

            update: {
                value: function (dt) {
                    if (!needsUpdate)
                        return;
                    
                    var pos = transformComponent.position;
                    var currX = pos.x;
                    var currY = pos.y;
                    var currZ = pos.z;

                    if (currX < minX)
                        pos.x = minX;
                    else if (currX > maxX)
                        pos.x = maxX;

                    if (currY < minY)
                        pos.y = minY;
                    else if (currY > maxY)
                        pos.y = maxY;

                    if (currZ < minZ)
                        pos.z = minZ;
                    else if (currZ > maxZ)
                        pos.z = maxZ;
                                        
                    transformComponent.position = pos;
                    needsUpdate = false;
                }
            }
        });
    }

    BoxConstrainer.prototype = Object.create(SGE.BehaviorComponent.prototype);
    Object.defineProperty(BoxConstrainer.prototype, 'constructor', { value: BoxConstrainer });


    var VectorController = (function () {

        function setVector2(dest, names) {
            return dest.set(this[names[0]], this[names[1]]);
        }

        function setVector3(dest, names) {
            return dest.set(this[names[0]], this[names[1]], this[names[2]]);
        }

        function setVector4(dest, names) {
            return dest.set(this[names[0]], this[names[1]], this[names[2]], this[names[3]]);
        }

        function onChange(dest, attrName, setFun, names) {
            dest[attrName] = setFun.call(this, dest[attrName], names);
        }

        return function (ctor) {

            var setFun;
            var currNames;
            var count;

            switch (ctor) {
                case SGE.Vector2:
                    setFun = setVector2;
                    currNames = ['x', 'y'];
                    count = 2;
                    break;
                case SGE.Vector3:
                    setFun = setVector3;
                    currNames = ['x', 'y', 'z'];
                    count = 3;
                    break;
                case SGE.Vector4:
                    setFun = setVector4;
                    currNames = ['x', 'y', 'z', 'w'];
                    count = 4;
                    break;
                default:
                    throw new Error('invalid constructor');
            }

            var retFun = function (gui, dest, attrName, names, minValues, maxValues) {

                SGE.EventTarget.call(this);
                                
                this.folderController = gui.addFolder(attrName);
                Object.defineProperties(this, {
                    dest: {
                        get: function () {
                            return dest;
                        },
                        set: function (v) {
                            dest = v;
                            changeFun();
                        }
                    }
                });
                
                (function () {
                    var current = dest[attrName];
                    if (names == null)
                        names = currNames;
                    for (var i = 0; i < count; i++) {
                        var name = names[i];
                        this[name] = current[currNames[i]];
                        var controller;
                        if (minValues != null && maxValues != null)
                            controller = this.folderController.add(this, name, minValues[i], maxValues[i]);
                        else if (minValues != null)
                            controller = this.folderController.add(this, name, minValues[i]);
                        else if (maxValues != null)
                            controller = this.folderController.add(this, name, null, maxValues[i]);
                        else
                            controller = this.folderController.add(this, name);
                        controller.onChange(changeFun);
                        this[name + 'Controller'] = controller;
                    }
                }).call(this);

                var _this = this;

                function changeFun() {
                    onChange.call(_this, _this.dest, attrName, setFun, names);
                    _this.trigger('changed');
                }

            };
            retFun.prototype = Object.create(SGE.EventTarget.prototype);            
            return retFun;
        };
    })();

    var Vector2Controller = VectorController(SGE.Vector2);
    Object.defineProperty(Vector2Controller.prototype, 'constructor', { value: Vector2Controller });
    var Vector3Controller = VectorController(SGE.Vector3);
    Object.defineProperty(Vector3Controller.prototype, 'constructor', { value: Vector3Controller });
    var Vector4Controller = VectorController(SGE.Vector4);
    Object.defineProperty(Vector4Controller.prototype, 'constructor', { value: Vector4Controller });    

    function ColorController(gui, dest, attrName) {
        Vector4Controller.call(this, gui, dest, attrName, ['red', 'green', 'blue', 'alpha'], [0.0, 0.0, 0.0, 0.0], [1.0, 1.0, 1.0, 1.0]);
    }
    ColorController.prototype = Object.create(Vector4Controller.prototype);
    Object.defineProperty(ColorController.prototype, 'constructor', { value: ColorController });
        
    function LitMaterialController(gui, dest, maxSpecularExponent) {
        maxSpecularExponent = maxSpecularExponent != null ? maxSpecularExponent : 1000.0;        

        this.ambientController = new ColorController(gui, dest, 'ambient');
        this.diffuseController = new ColorController(gui, dest, 'diffuse');
        this.specularController = new Vector4Controller(gui, dest, 'specular', ['red', 'green', 'blue', 'specular exponent'], [0.0, 0.0, 0.0, 1.0], [1.0, 1.0, 1.0, maxSpecularExponent]);

        var mirrorMaterials = [];
        var reflectAmbientChanges;
        var reflectDiffuseChanges;
        var reflectSpecularChanges;
                
        function addReflectListeners(){
            this.ambientController.addEventListener('changed', reflectAmbientChanges);
            this.diffuseController.addEventListener('changed', reflectDiffuseChanges);
            this.specularController.addEventListener('changed', reflectSpecularChanges);
        }

        function removeReflectListeners() {
            this.ambientController.removeEventListener('changed', reflectAmbientChanges);
            this.diffuseController.removeEventListener('changed', reflectDiffuseChanges);
            this.specularController.removeEventListener('changed', reflectSpecularChanges);
        }

        Object.defineProperties(this, {
            dest: {
                get: function () {
                    return dest;
                },
                set: function (v) {
                    dest = v;
                    this.ambientController.dest = dest;
                    this.diffuseController.dest = dest;
                    this.specularController.dest = dest;
                }
            },

            addMirrorMaterial: {
                value: function (mat) {
                    mirrorMaterials.push(mat);
                    if (mirrorMaterials.length > 1)
                        return;

                    function reflectChanges(name) {
                        return function () {
                            var mirrorMaterialsCount = mirrorMaterials.length;
                            for (var i = 0; i < mirrorMaterialsCount; i++)
                                mirrorMaterials[i][name] = dest[name];
                        };
                    }

                    reflectAmbientChanges = reflectChanges('ambient');
                    reflectDiffuseChanges = reflectChanges('diffuse');
                    reflectSpecularChanges = reflectChanges('specular');

                    addReflectListeners.call(this);
                }
            },

            removeMirrorMaterial: {
                value: function (mat) {
                    var index = mirrorMaterials.indexOf(mat);

                    if (index == -1)
                        return;

                    mirrorMaterials.splice(index, 1);

                    if (mirrorMaterials.length > 0)
                        return;

                    removeReflectListeners.call(this);
                    reflectAmbientChanges = null;
                    reflectDiffuseChanges = null;
                    reflectSpecularChanges = null;
                }
            }
        })
    }

    function DirectionalLightController(gui, light) {
        this.colorController = new ColorController(gui, light, 'color');
        this.directionController = new Vector3Controller(gui, light, 'direction', null, [-1.0, -1.0, -1.0], [1.0, 1.0, 1.0]);
    }
        
    function ShadowController(gui, light, lightController, scaleOnDir) {
        var shadowMapSize = light.shadowMapSize.x;
        var shadowBias = -light.shadowBias;

        Object.defineProperties(this, {
            shadowMapSize: {
                get: function () {
                    return shadowMapSize;
                },
                set: function (v) {
                    if (v == shadowMapSize)
                        return;
                    shadowMapSize = Math.floor(v);
                    light.shadowMapSize = light.shadowMapSize.set(v, v);
                }
            },

            shadowBias: {
                get: function () {
                    return shadowBias;
                },
                set: function (v) {
                    if (shadowBias == v)
                        return;
                    shadowBias = v;
                    light.shadowBias = -v;
                }
            }
        });

        this.castShadowsController = gui.add(light, 'castShadows');
        this.shadowMapSizeController = gui.add(this, 'shadowMapSize', 64, 4096);
        this.shadowBiasController = gui.add(this, 'shadowBias', 0.0, 0.1);

        if (lightController != null) {
            var transformComponent = light.object3D.transformComponent;
            lightController.directionController.addEventListener('changed', function () {
                var pos = transformComponent.position;
                pos.fromVector3(light.direction).scale(scaleOnDir);
                transformComponent.position = pos;
            });
        }
    }

    function SingleMaterialRebuilder(material, materialParams) {
        SGE.EventTarget.call(this);
        this.renderComponents = [];
        this.material = material;
        var needsUpdate = false;
        this.addParam = function (name, value) {
            materialParams[name] = value;
            needsUpdate = true;
        };
        this.removeParam = function (name) {
            this.addParam(name, null);
        };
        this.rebuild = function () {
            if (!needsUpdate)
                return;
            var mat = SGE.makeMaterial(materialParams);
            this.material = mat;
            var renderComponents = this.renderComponents;
            var renderComponentsCount = renderComponents.length;
            for (var i = 0 ; i < renderComponentsCount; i++) {
                var renderComponent = renderComponents[i];
                renderComponent.removeMaterialByIndex(0);
                renderComponent.addMaterial(mat);
            }
            needsUpdate = false;
            this.trigger('rebuilt');
        };
        var _this = this;
        this.makeBooleanListener = function (names, values, materialControllers) {
            var materialControllersCount;
            if (materialControllers != null) {
                if (!(materialControllers instanceof Array)) {
                    materialControllers = [materialControllers];
                    materialControllersCount = 1;
                }else
                    materialControllersCount = materialControllers.length;
            }
            else
                materialControllersCount = 0;
            var namesCount;
            if (!(names instanceof Array)) {
                names = [names];
                namesCount = 1;
            } else 
                namesCount = names.length;
            var valuesCount;
            if (!(values instanceof Array)) {
                values = [values];
                valuesCount = 1;
            } else
                valuesCount = values.length;

            namesCount = Math.min(namesCount, valuesCount);

            return function(set){
                if (set) 
                    for (var i = 0; i < namesCount; i++)
                        _this.addParam(names[i], values[i]);
                
                else
                    for (var i = 0; i < namesCount; i++)
                        _this.removeParam(names[i]);

                _this.rebuild();
                for (var i = 0; i < materialControllersCount; i++)
                    materialControllers[i].dest = _this.material;
            };
        };
    }
    SingleMaterialRebuilder.prototype = Object.create(SGE.EventTarget.prototype);
    Object.defineProperty(SingleMaterialRebuilder.prototype, 'constructor', { value: SingleMaterialRebuilder });


    function navigationAnimation(from, to, duration, animationCurve) {
        animationCurve.removeKeys();

        animationCurve.addKey(from, 0.0);
        animationCurve.addKey(to, duration);

        return animationCurve;
    }

    function RandomNavigationComponent(getTargetFun, duration) {
        SGE.BehaviorComponent.call(this);

        var transformComponent;
        var hasTarget = false;
        var animCurve = new SGE.KeyFrameAnimation(SGE.Vector3);
        var animClip = new SGE.AnimationClip(false, duration);
        animClip.addCurve(function () { return this.object3D.transformComponent; }, 'position', animCurve);
        var animator = new SGE.AnimatorComponent();
        animator.addClip('move', animClip);
        var pos = new SGE.Vector3();

        function onPlayed() {
            hasTarget = false;
        }

        Object.defineProperties(this, {

            onActivated: {
                value: function () {
                    var object3D = this.object3D;
                    transformComponent = object3D.transformComponent;
                    object3D.addComponent(animator);
                }
            },

            onDeactivated: {
                value: function () {
                    transformComponent = null;
                    this.object3D.removeComponent(animator);
                }
            },

            update: {
                value: function (dt) {
                    if (!hasTarget) {
                        var target = getTargetFun();
                        hasTarget = true;
                        pos.fromVector3(transformComponent.position);
                        animCurve = navigationAnimation(pos, target, duration, animCurve);
                        animator.play('move', 1.0, onPlayed);
                    }
                }
            }
        });
    }
    RandomNavigationComponent.prototype = Object.create(SGE.BehaviorComponent.prototype);
    Object.defineProperty(RandomNavigationComponent.prototype, 'constructor', { value: RandomNavigationComponent });
        
    function ParticleSystem(particleCount) {
        SGE.BehaviorComponent.call(this);

        this.perFrameVertexLayout = new SGE.VertexLayout();
        this.perFrameDataMap = {};
        this.perFrameVertexBuffer = SGE.createVertexBuffer(this.perFrameVertexLayout, this.perFrameDataMap, 0, SGE.Usage.DYNAMIC, false);

        this.perChangeVertexLayout = new SGE.VertexLayout();
        this.perChangeDataMap = {};
        this.perChangeVertexBuffer = SGE.createVertexBuffer(this.perChangeVertexLayout, this.perChangeDataMap, 0, SGE.Usage.DYNAMIC, false);
        this.needsUpdate = false;

        this.particleMesh = new SGE.Mesh({
            vertexBuffer: [this.perChangeVertexBuffer, this.perFrameVertexBuffer], primitiveTopology: SGE.PrimitiveTopology.POINTS
        });

        this.particleMaterial = null;
        this.rendererComponent = null;
        
        this.aliveCount = 0;

        Object.defineProperties(this, {

            onActivated: {
                value: function () {
                    var rendererComponent = new SGE.MeshRendererComponent(this.particleMesh, this.particleMaterial);
                    this.object3D.addComponent(rendererComponent);
                    this.rendererComponent = rendererComponent;
                }
            },

            onDeactivated : {
                value: function () {
                    this.object3D.removeComponent(this.rendererComponent);
                    this.rendererComponent = null;
                }
            },

            particleCount: {
                get: function () {
                    return particleCount;
                },
                set: function (v) {
                    if (v == particleCount)
                        return;

                    particleCount = v;

                    this.init();
                    this.aliveCount = 0;

                    this.perFrameVertexBuffer.vertexCount = 0;
                    this.perChangeVertexBuffer.vertexCount = 0;
                }
            },

            update: {
                value: function (dt) {
                    dt /= 1000.0;
                    var updaters = this.particleUpdaters;
                    var count = updaters.length;
                    for (var i = 0; i < count; i++)
                        updaters[i].update(this, dt);

                    this.emit(dt);
                }
            }
        });

        this.emitRatio = particleCount * 0.1;

        this.particleGenerators = [];
        this.particleUpdaters = [];
        
        this.emit = function (dt) {

            var aliveCount = this.aliveCount;
            var deadParticles = particleCount - aliveCount;
            var count = Math.min(Math.ceil(dt * this.emitRatio), deadParticles);

            if (count > 0) {

                var generators = this.particleGenerators;
                var generatorsCount = generators.length;
                for (var i = 0; i < generatorsCount; i++)
                    generators[i].generate(this, aliveCount, count);

                aliveCount += count;
                this.needsUpdate = true;
            }

            var vertexBuffer;

            if (this.needsUpdate) {
                vertexBuffer = this.perChangeVertexBuffer;
                vertexBuffer.vertexCount = aliveCount;
                vertexBuffer.build();
                this.needsUpdate = false;
            }

            vertexBuffer = this.perFrameVertexBuffer;
            vertexBuffer.vertexCount = aliveCount;
            vertexBuffer.build();

            this.aliveCount = aliveCount;
        };

        this.kill = function (i) {

            this.needsUpdate = true;

            //swap the last alive particle with the dead one

            this.aliveCount--;
            var lastAliveIndex = this.aliveCount;

            //check if the last alive particle is the one to kill
            if (i == lastAliveIndex)
                return;

            this.swap(i, lastAliveIndex);
        };
    }

    ParticleSystem.prototype = Object.create(SGE.BehaviorComponent.prototype);
    Object.defineProperty(ParticleSystem.prototype, 'constructor', { value: ParticleSystem });

    
    return {
        DemoInit: DemoInit,
        addFileFolder: addFileFolder,
        SphereView: SphereView,
        FreeView: FreeView,
        FPSMove: FPSMove,
        BoxConstrainer : BoxConstrainer,
        Vector2Controller : Vector2Controller,
        Vector3Controller: Vector3Controller,
        Vector4Controller: Vector4Controller,
        ColorController: ColorController,
        LitMaterialController: LitMaterialController,
        DirectionalLightController: DirectionalLightController,        
        ShadowController: ShadowController,
        SingleMaterialRebuilder: SingleMaterialRebuilder,        
        RandomNavigationComponent: RandomNavigationComponent,        
        ParticleSystem : ParticleSystem
    };
});