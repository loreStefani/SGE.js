requirejs.config({
        
    shim: {
        'libs/webgl-debug': {
            exports: 'WebGLDebugUtils'
        },

        'libs/jquery': {
            exports : 'jQuery'
        },

        'libs/Stats': {
            exports : 'Stats'
        }
    }
});