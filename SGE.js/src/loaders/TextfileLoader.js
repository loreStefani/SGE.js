define(['./Loader'], function (Loader) {

    'use strict';

    function TextfileLoader() {
        Loader.call(this);
    }

    TextfileLoader.prototype = Object.create(Loader.prototype);

    Object.defineProperties(TextfileLoader.prototype, {

        constructor: { value: TextfileLoader },

        /**
        * loads a list of text files provided via argument list which is assumed containing a last element of type function 
        * that will be called once all the files are loaded (onLoad function).
        * a single provided argument could be single URL or an array of URLs, the onLoad function takes a single array as argument which
        * i-th element is either a string or an array of strings respectively if the i-th argument was an URL or an array of URLs
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
                var fileCount = 0;

                //onLoad argument
                var files = [];

                for (var i = 0; i < count ; i++) {

                    var arg = arguments[i];
                    var result;

                    if (arg instanceof Array) {

                        var argFilesCount = arg.length;
                        var argFiles = new Array(argFilesCount);

                        for (var j = 0 ; j < argFilesCount; j++)
                            argFiles[j] = addFile(arg[j], setResponseArray(i, j));

                        //result is an array of requests
                        result = argFiles;
                    }
                    else
                        //result is a request
                        result = addFile(arg, setResponse(i));

                    //requests will be replaced once the correspondent file is loaded
                    files.push(result);
                }

                function setResponse(i) {
                    return function (responseText) {
                        files[i] = responseText;
                    };
                }

                function setResponseArray(i, j) {
                    return function (responseText) {
                        files[i][j] = responseText;
                    };
                }

                function addFile(src, setResponse) {
                    fileCount++;
                    var req = new XMLHttpRequest();
                    req.onload = onLoadedFile(src, req, setResponse);
                    req.open('GET', src, true);
                    req.send();                    
                    return req;
                }

                function onLoadedFile(src, req, setResponse) {

                    return function () {
                        loaded++;

                        var responseText = req.responseText;

                        if (responseText == null)
                            responseText = 'error loading : ' + src + ', response : ' + req.statusText;

                        //replace request with file content or error status
                        setResponse(responseText);

                        //check if all the files have been loaded
                        if (loaded == fileCount)
                            onLoad(files);
                    };
                }
            }
        }

    });
        

    return new TextfileLoader();

});
