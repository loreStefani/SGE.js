define(['./Loader'], function (Loader) {

    'use strict';

    function ResourceLoader() {
        Loader.call(this);
    }
    ResourceLoader.prototype = Object.create(Loader.prototype);

    Object.defineProperties(ResourceLoader.prototype,{

        constructor :  { value: ResourceLoader },

        /**
        * invoke the load function of a list of Loader objects with the respective list of arguments,
        * a single argument is a 2 elements array : the first element is an array containing the list of 
        * arguments the Loader needs to be invoked with (except for the onLoad function), the second element is the Loader object.
        * the last argument makes an exception case and is a function which will be called once all the Loader have done loading (onLoad function).
        * the onLoad function takes as many arguments as Loader provided, the i-th argument is the result of the i-th Loader ( the argument that the Loader 
        * would have passed to the function if used alone )
        */
        load: {

            value: function () {

                var count = arguments.length - 1;
                
                if (count < 1)
                    throw new Error('invalid argument');
                
                var onLoad = arguments[count];
                if (typeof onLoad !== 'function')
                    throw new Error('missing onload function');

                var loaded = 0;
                //onLoad argument
                var resources = new Array(count);

                for (var i = 0 ; i < count ; i++) {

                    var resourceDesc = arguments[i];

                    var sources = resourceDesc[0];
                    var loader = resourceDesc[1];

                    if (!(sources instanceof Array && loader instanceof Loader))
                        throw new Error('invalid argument');
                    
                    //copy argument list and push the load handler
                    var loadArguments = sources.slice(0);
                    loadArguments.push(onResourceLoaded(i));

                    loader.load.apply(loader, loadArguments);
                }

                function onResourceLoaded(i) {

                    return function () {

                        //copy result and put it in the 
                        //correspondent position
                        var args = arguments[0];
                        var argsLen = args.length;
                        
                        var result = new Array(argsLen);                        
                        resources[i] = result;                        
                        for (var j = 0; j < argsLen ; j++)
                            result[j] = args[j];
                        
                        loaded++;
                        //check if all the loader have done
                        if (loaded == count)
                            onLoad.apply(null, resources);
                    };
                    
                }
            }

        }
    });
    

    return new ResourceLoader();
});