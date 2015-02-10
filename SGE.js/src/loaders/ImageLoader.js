define(['./Loader'], function (Loader) {

    'use strict';

    function ImageLoader() {
        Loader.call(this);
    }
    ImageLoader.prototype = Object.create(Loader.prototype);

    Object.defineProperties(ImageLoader.prototype, {

        constructor :  { value: ImageLoader },
        
        /**
        * loads a list of images provided via argument list which is assumed containing a last element of type function 
        * that will be called once all images are loaded (onLoad function).
        * a single provided argument could be single URL or an array of URLs, the onLoad function takes a single array as argument which
        * i-th element is either an Image object or an array of Image objects respectively if the i-th argument was an URL or an array of URLs
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
                var imageCount = 0;
                //onLoad argument
                var images = [];

                for (var i = 0; i < count ; i++) {
                    var arg = arguments[i];
                    var result;

                    if (arg instanceof Array) {
                        //the argument is an array, process all the elements
                        var argImagesCount = arg.length;
                        var argImages = new Array(argImagesCount);
                        for (var j = 0 ; j < argImagesCount; j++)
                            argImages[j] = addImage(arg[j]);

                        //result is an array of Image
                        result = argImages;
                    }
                    else
                        //result is an Image
                        result = addImage(arg);

                    images.push(result);
                }

                function addImage(src) {
                    imageCount++;
                    var image = new Image();
                    image.onload = onLoadedImage;                    
                    image.src = src;
                    return image;
                }

                function onLoadedImage() {
                    loaded++;
                    //check if all the images have been loaded
                    if (loaded == imageCount) {
                        //release closures
                        for (var i = 0 ; i < count; i++) {
                            var image = images[i];
                            if (image instanceof Array) {
                                var imagesCount = image.length;
                                for (var j = 0; j < imagesCount; j++)
                                    image[j].onLoad = null;
                            }else
                                image.onload = null;
                        }
                        onLoad(images);
                    }
                }
            }
        }

    });      

    return new ImageLoader();
});