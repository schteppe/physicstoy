function Thumbnail(){}

/**
 * Draw a scene thumbnail on a HTML5 Canvas
 * @param  {Object} ctx   Canvas 2D context
 * @param  {Object} scene The serialized scene to render.
 * @param  {Number} w     Width
 * @param  {Number} h     Height
 * @param  {Object} options
 */
Thumbnail.drawOnCanvas = function(ctx,scene,w,h,options){
    options = options || {};

    var vec2 = p2.vec2;

    var i, j;
    var settings = {
        lineWidth : 0.1,
        fillStyle : "red",
        strokeStyle : "black"
    };
    for(var key in options)
        settings[key] = options[key];

    if(scene.version !== 8)
        throw new Error("Scene format not supported!");

    function getSceneAABB(scene){
        var aabb = new p2.AABB();
        var max = 1e6;
        var body = new p2.Body();
        for (var i = 0; i < scene.bodies.length; i++) {
            var bodyConfig = scene.bodies[i];
            vec2.set(body.position, bodyConfig.x, bodyConfig.y);
            body.angle = bodyConfig.angle;

            for (var j = 0; j < bodyConfig.shapes.length; j++) {
                body.shapes.length = 0;
                var s = bodyConfig.shapes[j];
                var shape = null;
                switch(s.type){
                case "circle":
                    shape = new p2.Circle(s.radius);
                    break;
                case "box":
                    shape = new p2.Rectangle(s.width, s.height);
                    break;
                }
                if(shape){
                    body.addShape(shape, [s.x, s.y], s.angle);
                    body.aabbNeedsUpdate = true;
                    body.updateAABB();
                    if(p2.vec2.dist(body.aabb.lowerBound, body.aabb.upperBound) < 1e6){
                        aabb.extend(body.aabb);
                    }
                    body.removeShape(shape);
                }
            }
        }
        return aabb;
    }

    // Get camera settings
    var worldAABB = getSceneAABB(scene);
    var physicsWidth = worldAABB.upperBound[0] - worldAABB.lowerBound[0];
    var physicsHeight = worldAABB.upperBound[1] - worldAABB.lowerBound[1];
    var zoomX = w / physicsWidth;
    var zoomY = h / physicsHeight;
    var zoom = zoomX > zoomY ? zoomY : zoomX;
    zoom *= 0.75;

    var center = p2.vec2.create();
    p2.vec2.add(center, worldAABB.upperBound, worldAABB.lowerBound);
    p2.vec2.scale(center, center, 0.5);

    // Transforms a shape-local point to world coords.
    function localToWorld(s,b,localPoint){
        // First convert to body local
        var bodyPoint = vec2.create();
        vec2.rotate(bodyPoint, localPoint, s.angle);
        vec2.add(bodyPoint, [s.x, s.y], bodyPoint);

        // Then to world
        var worldPoint = vec2.create();
        vec2.rotate(worldPoint, bodyPoint, b.angle);
        vec2.add(worldPoint, [b.x, b.y], worldPoint);

        return worldPoint;
    }

    // function polygon(c,points,options){
    //     setStyle(c,options);
    //     c.beginPath();
    //     for(var i=0; i<points.length; i++){
    //         var x = options.scaleX * points[i][0] + options.offsetX,
    //             y = options.scaleY * points[i][1] + options.offsetY;
    //         if(i==0)
    //             c.moveTo(x,y);
    //         else
    //             c.lineTo(x,y);
    //     }
    //     // Last point
    //     var x = options.scaleX * points[0][0] + options.offsetX,
    //         y = options.scaleY * points[0][1] + options.offsetY;
    //     c.lineTo(x,y);
    //     c.stroke();
    //     c.fill();
    // }

    // function line(c,x0,y0,x1,y1,options){
    //     setStyle(c,options);
    //     c.beginPath();
    //     c.moveTo(x0, y0);
    //     c.lineTo(x1, y1);
    //     c.stroke();
    // }

    // function setStyle(c,options){
    //     c.fillStyle =   options.fillStyle;
    //     c.lineWidth =   options.lineWidth;
    //     c.strokeStyle = options.strokeStyle;
    // }

    ctx.save();
    ctx.translate(w / 2, h / 2);  // Translate to the center
    ctx.scale(zoom, -zoom);       // Zoom in and flip y axis
    ctx.translate(-center[0], -center[1]);
    ctx.lineWidth = settings.lineWidth;

    // Draw bodies
    for (i = 0; i < scene.bodies.length; i++) {
        var b = scene.bodies[i];

        ctx.save();
        ctx.rotate(b.angle);
        ctx.translate(b.x, b.y);

        for (j = 0; j < b.shapes.length; j++) {
            var s = b.shapes[j];
            ctx.fillStyle = s.color;

            ctx.save();
            ctx.rotate(s.angle);
            ctx.translate(s.x, s.y);

            switch(s.type){
            case "circle":
                // Draw circles
                ctx.beginPath();
                ctx.arc(0, 0, s.radius, 0, 2 * Math.PI, false);
                ctx.stroke();
                ctx.fill();

                ctx.lineWidth = settings.lineWidth / 2;
                ctx.beginPath();
                ctx.moveTo(s.radius, 0);
                ctx.lineTo(0, 0);
                ctx.stroke();
                ctx.lineWidth = settings.lineWidth;

                break;

            case "box":
                ctx.beginPath();
                ctx.rect(- s.width / 2, - s.height / 2, s.width, s.height);
                ctx.stroke();
                ctx.fill();
                break;

            case "line":
                var worldStart = localToWorld(s,b,s.start);
                var worldEnd = localToWorld(s,b,s.end);
                line(ctx,
                     worldStart[0],
                     worldStart[1],
                     worldEnd[0],
                     worldEnd[1],
                     settings);
                break;

            case "polygon":
                var points = [];
                for (var k = 0; k < s.points.length; k++) {
                    points.push(localToWorld(s,b,s.points[k]));
                }

                // Draw
                polygon(    ctx,
                            points,
                            settings);
                break;
            }

            ctx.restore();
        }
        ctx.restore();
    }
};
