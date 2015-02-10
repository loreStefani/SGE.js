define(
    [                        
        'core/Buffers', 'core/DataType', 'core/Device', 'core/EventTarget', 'core/IDObject', 'core/VMath', 'core/Pools', 'core/PrimitiveTopology', 'core/ProgramVariables',
        'core/Shaders', 'core/States', 'core/Textures', 'core/Rectangles',

        'engine/Application', 'engine/Engine', 
        'engine/Scene',

        'engine/renderSystem/GeometryGenerator',

        'engine/renderSystem/RenderSystem', 'engine/renderSystem/MeshRendererComponent', 'engine/renderSystem/Cameras', 'engine/renderSystem/Lights', 'engine/renderSystem/Materials',
        'engine/renderSystem/Meshes', 'engine/renderSystem/Programs', 'engine/renderSystem/Collisions',

        'engine/animationSystem/AnimationClip', 'engine/animationSystem/AnimationCurve', 'engine/animationSystem/AnimatorComponent',

        'engine/animationSystem/Interpolators',

        'engine/animationSystem/Skeleton',
        
        'engine/Object3D',
        
        'engine/TransformComponent',
        'engine/behaviorSystem/BehaviorComponent',

        'loaders/Loader', 'loaders/ImageLoader', 'loaders/TextFileLoader', 'loaders/ResourceLoader',

        'Utils'
    ],

    function (
                                
        Buffers, DataType, Device, EventTarget, IDObject, VMath, Pools, PrimitiveTopology, ProgramVariables, Shaders, States, Textures, Rectangles,

        Application,  Engine, Scene, GeometryGenerator,

        RenderSystem, MeshRendererComponent, Cameras, Lights, Materials, Meshes, Programs, Collisions,

        AnimationClip, AnimationCurve, AnimatorComponent, Interpolators,

        Skeleton, Object3D, TransformComponent, BehaviorComponent,      

        Loader, ImageLoader, TextFileLoader, ResourceLoader,

        Utils    ) {

    'use strict';
        
    var SGE = {};
    
    Object.defineProperties(SGE, {

        aquireModule: {
            value: function (module) {
                for (var key in module)
                    Object.defineProperty(this, key, { value: module[key] });
            }
        }
    });
        
    SGE.AnimationClip = AnimationClip;
    SGE.AnimatorComponent = AnimatorComponent;
    SGE.Interpolators = Interpolators;    
    SGE.aquireModule(AnimationCurve);
    SGE.aquireModule(Skeleton);    
    
    SGE.Cameras = Cameras;    
    SGE.aquireModule(Object3D);
    SGE.TransformComponent = TransformComponent;
    SGE.aquireModule(Cameras);
    
    SGE.Buffers = Buffers;
    SGE.DataType = DataType;
    SGE.Device = Device;
    SGE.EventTarget = EventTarget;
    SGE.IDObject = IDObject;
    SGE.VMath = VMath;
    SGE.Vector2 = VMath.Vector2;
    SGE.Vector3 = VMath.Vector3;
    SGE.Vector4 = VMath.Vector4;
    SGE.Vector2Array = VMath.Vector2Array;
    SGE.Vector3Array = VMath.Vector3Array;
    SGE.Vector4Array = VMath.Vector4Array;
    SGE.Matrix2 = VMath.Matrix2;
    SGE.Matrix3 = VMath.Matrix3;
    SGE.Matrix4 = VMath.Matrix4;
    SGE.Matrix2Array = VMath.Matrix2Array;
    SGE.Matrix3Array = VMath.Matrix3Array;
    SGE.Matrix4Array = VMath.Matrix4Array;
    SGE.Quaternion = VMath.Quaternion;
    SGE.QuaternionArray = VMath.QuaternionArray;
    SGE.Pools = Pools;
    SGE.PrimitiveTopology = PrimitiveTopology;
    SGE.ProgramVariables = ProgramVariables;    
    SGE.Shaders = Shaders;
    SGE.States = States;
    SGE.Textures = Textures;
    SGE.Rectangles = Rectangles;    
    SGE.aquireModule(Buffers);    
    SGE.ArrayPool = Pools.ArrayPool;
    SGE.ObjectPool = Pools.ObjectPool;
    SGE.aquireModule(ProgramVariables);
    SGE.aquireModule(Shaders);
    SGE.aquireModule(States);
    SGE.aquireModule(Textures);
    SGE.aquireModule(Rectangles);
            
    SGE.Application = Application;
    SGE.Collisions = Collisions;
    SGE.Engine = Engine;
    SGE.GeometryGenerator = GeometryGenerator;
    SGE.Lights = Lights;
    SGE.Materials = Materials;
    SGE.Meshes = Meshes;
    SGE.Programs = Programs;        
    SGE.MeshRendererComponent = MeshRendererComponent;
    SGE.Scene = Scene;
    SGE.aquireModule(Collisions);
    SGE.aquireModule(Lights);
    SGE.aquireModule(Materials);
    SGE.aquireModule(Meshes);

    SGE.Loader = Loader;
    SGE.ImageLoader = ImageLoader;
    SGE.TextFileLoader = TextFileLoader;
    SGE.ResourceLoader = ResourceLoader;

    SGE.Utils = Utils;
    SGE.BehaviorComponent = BehaviorComponent;
                   
            
    return Object.freeze(SGE);
});