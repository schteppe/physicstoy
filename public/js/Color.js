function Color(){

}

//http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
Color.componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
};

Color.rgbToHex = function(r, g, b) {
    return Color.componentToHex(r) + Color.componentToHex(g) + Color.componentToHex(b);
};

//http://stackoverflow.com/questions/43044/algorithm-to-randomly-generate-an-aesthetically-pleasing-color-palette
Color.randomPastelHex = function(){
    var mix = [255,255,255];
    var red =   Math.floor(Math.random()*256);
    var green = Math.floor(Math.random()*256);
    var blue =  Math.floor(Math.random()*256);

    // mix the color
    red =   Math.floor((red +   3*mix[0]) / 4);
    green = Math.floor((green + 3*mix[1]) / 4);
    blue =  Math.floor((blue +  3*mix[2]) / 4);

    return Color.rgbToHex(red,green,blue);
};