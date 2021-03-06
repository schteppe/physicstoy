/* global PIXI,Renderer */

/**
 * Renderer using Pixi.js
 * @class WebGLRenderer
 * @constructor
 * @extends Renderer
 * @param {Object}  [options]
 * @param {Number}  [options.lineWidth=0.01]
 * @param {Number}  [options.scrollFactor=0.1]
 * @param {Number}  [options.width]               Num pixels in horizontal direction
 * @param {Number}  [options.height]              Num pixels in vertical direction
 */
function WebGLRenderer(world, options){
    options = options || {};

    var that = this;

    var settings = {
        lineWidth : 0.01,
        scrollFactor : 0.1,
        width : 1280, // Pixi screen resolution
        height : 720,
        useDeviceAspect : false,
        sleepOpacity : 0.2,
    };
    for(var key in options){
        settings[key] = options[key];
    }

    if(settings.useDeviceAspect){
        settings.height = window.innerHeight / window.innerWidth * settings.width;
    }

    //this.settings = settings;
    this.lineWidth =            settings.lineWidth;
    this.scrollFactor =         settings.scrollFactor;
    this.sleepOpacity =         settings.sleepOpacity;

    this.sprites = [];
    this.springSprites = [];
    this.debugPolygons = false;

    Renderer.call(this,world,options);

    for(var key in settings){
        this.settings[key] = settings[key];
    }

    this.pickPrecision = 0.1;

    // Update "ghost draw line"
    this.on("drawPointsChange",function(e){
        var g = that.drawShapeGraphics;
        var path = that.drawPoints;

        g.clear();

        var path2 = [];
        for(var j=0; j<path.length; j++){
            var v = path[j];
            path2.push([v[0], v[1]]);
        }

        that.drawPath(g,path2,0xff0000,false,that.lineWidth,false);
    });

    // Update draw circle
    this.on("drawCircleChange",function(e){
        var g = that.drawShapeGraphics;
        g.clear();
        var center = that.drawCircleCenter;
        var R = p2.vec2.dist(center, that.drawCirclePoint);
        that.drawCircle(g,center[0], center[1], 0, R,false, that.lineWidth);
    });

    // Update draw circle
    this.on("drawRectangleChange",function(e){
        var g = that.drawShapeGraphics;
        g.clear();
        var start = that.drawRectStart;
        var end = that.drawRectEnd;
        var width = start[0] - end[0];
        var height = start[1] - end[1];
        that.drawRectangle(g, start[0] - width/2, start[1] - height/2, 0, width, height, false, false, that.lineWidth, false);
    });
}
WebGLRenderer.prototype = Object.create(Renderer.prototype);

WebGLRenderer.prototype.stagePositionToPhysics = function(out,stagePosition){
    var x = stagePosition[0],
        y = stagePosition[1];
    p2.vec2.set(out, x, y);
    return out;
};

/**
 * Initialize the renderer and stage
 */
var init_stagePosition = p2.vec2.create(),
    init_physicsPosition = p2.vec2.create();
WebGLRenderer.prototype.init = function(){
    var w = this.w,
        h = this.h,
        s = this.settings;

    var that = this;

    var renderer =  this.renderer =     PIXI.autoDetectRenderer(s.width, s.height, null, null, true);
    var stage =     this.stage =        new PIXI.DisplayObjectContainer();
    var container = this.container =    new PIXI.Stage(0xFFFFFF,true);

    var el = this.element = this.renderer.view;
    el.tabIndex = 1;
    el.classList.add(Renderer.elementClass);
    el.setAttribute('style','width:100%;');

    var div = this.elementContainer = document.getElementById('p2-container');
    div.setAttribute('style','width:100%; height:100%');
    div.appendChild(el);
    el.focus();
    el.oncontextmenu = function(e){
        return false;
    };

    this.container.addChild(stage);

    // Graphics object for drawing shapes
    this.drawShapeGraphics = new PIXI.Graphics();
    stage.addChild(this.drawShapeGraphics);

    // Graphics object for contacts
    this.contactGraphics = new PIXI.Graphics();
    stage.addChild(this.contactGraphics);

    // Graphics object for constraints
    this.constraintsGraphics = new PIXI.Graphics();
    stage.addChild(this.constraintsGraphics);

    // Graphics object for AABBs
    this.aabbGraphics = new PIXI.Graphics();
    stage.addChild(this.aabbGraphics);

    // Graphics object for selection
    this.selectionGraphics = new PIXI.Graphics();
    stage.addChild(this.selectionGraphics);

    stage.scale.x = 200; // Flip Y direction.
    stage.scale.y = -200;

    var lastX, lastY, lastMoveX, lastMoveY, startX, startY, lastDownX, lastDownY, down=false;

    var physicsPosA = p2.vec2.create();
    var physicsPosB = p2.vec2.create();
    var stagePos = p2.vec2.create();
    var initPinchLength = 0;
    var initScaleX = 1;
    var initScaleY = 1;
    var lastNumTouches = 0;
    container.mousedown = container.touchstart = function(e){
        lastMoveX = lastDownX = e.global.x;
        lastMoveY = lastDownY = e.global.y;

        if(e.originalEvent.touches){
            lastNumTouches = e.originalEvent.touches.length;
        }

        if(e.originalEvent.touches && e.originalEvent.touches.length === 2){

            var touchA = that.container.interactionManager.touchs[0];
            var touchB = that.container.interactionManager.touchs[1];

            var pos = touchA.getLocalPosition(stage);
            p2.vec2.set(stagePos, pos.x, pos.y);
            that.stagePositionToPhysics(physicsPosA, stagePos);

            var pos = touchB.getLocalPosition(stage);
            p2.vec2.set(stagePos, pos.x, pos.y);
            that.stagePositionToPhysics(physicsPosB, stagePos);

            initPinchLength = p2.vec2.dist(physicsPosA, physicsPosB);

            var initScaleX = stage.scale.x;
            var initScaleY = stage.scale.y;

            return;
        }
        lastX = e.global.x;
        lastY = e.global.y;
        startX = stage.position.x;
        startY = stage.position.y;
        down = true;

        that.lastMousePos = e.global;

        var pos = e.getLocalPosition(stage);
        p2.vec2.set(init_stagePosition, pos.x, pos.y);
        that.stagePositionToPhysics(init_physicsPosition, init_stagePosition);
        that.handleMouseDown(init_physicsPosition);
    };
    container.mousemove = container.touchmove = function(e){
        if(e.originalEvent.touches){
            if(lastNumTouches !== e.originalEvent.touches.length){
                lastX = e.global.x;
                lastY = e.global.y;
                startX = stage.position.x;
                startY = stage.position.y;
            }

            lastNumTouches = e.originalEvent.touches.length;
        }

        lastMoveX = e.global.x;
        lastMoveY = e.global.y;

        if(e.originalEvent.touches && e.originalEvent.touches.length === 2){
            var touchA = that.container.interactionManager.touchs[0];
            var touchB = that.container.interactionManager.touchs[1];

            var pos = touchA.getLocalPosition(stage);
            p2.vec2.set(stagePos, pos.x, pos.y);
            that.stagePositionToPhysics(physicsPosA, stagePos);

            var pos = touchB.getLocalPosition(stage);
            p2.vec2.set(stagePos, pos.x, pos.y);
            that.stagePositionToPhysics(physicsPosB, stagePos);

            var pinchLength = p2.vec2.dist(physicsPosA, physicsPosB);

            // Get center
            p2.vec2.add(physicsPosA, physicsPosA, physicsPosB);
            p2.vec2.scale(physicsPosA, physicsPosA, 0.5);
            that.zoom(
                (touchA.global.x + touchB.global.x) * 0.5,
                (touchA.global.y + touchB.global.y) * 0.5,
                null,
                pinchLength / initPinchLength * initScaleX, // zoom relative to the initial scale
                pinchLength / initPinchLength * initScaleY
            );

            return;
        }

        if(down && that.state === Renderer.PANNING){
            var newStageX = e.global.x - lastX + startX;
            var newStageY = e.global.y - lastY + startY;
            stage.position.x = newStageX;
            stage.position.y = newStageY;
        }

        that.lastMousePos = e.global;

        var pos = e.getLocalPosition(stage);
        p2.vec2.set(init_stagePosition, pos.x, pos.y);
        that.stagePositionToPhysics(init_physicsPosition, init_stagePosition);
        that.handleMouseMove(init_physicsPosition);
    };
    var lastUpTime = performance.now();
    container.mouseup = container.touchend = container.dblclick = function(e){
        var doubleClick = performance.now() - lastUpTime < 300;

        lastUpTime = performance.now();
        if(e.originalEvent.touches){
            lastNumTouches = e.originalEvent.touches.length;
        }

        down = false;
        lastMoveX = e.global.x;
        lastMoveY = e.global.y;

        that.lastMousePos = e.global;

        var pos = e.getLocalPosition(stage);
        p2.vec2.set(init_stagePosition, pos.x, pos.y);
        that.stagePositionToPhysics(init_physicsPosition, init_stagePosition);
        that.handleMouseUp(init_physicsPosition);

        var movedDist = Math.sqrt(Math.pow(e.global.x - lastDownX, 2) + Math.pow(e.global.y - lastDownY, 2));
        if(movedDist < 10){
            if(doubleClick)
                that.handleDoubleClick(init_physicsPosition, e.originalEvent);
            else
                that.handleClick(init_physicsPosition, e.originalEvent);
        }
    };

    // http://stackoverflow.com/questions/7691551/touchend-event-in-ios-webkit-not-firing
    this.element.ontouchmove = function(e){
        e.preventDefault();
    };

    function MouseWheelHandler(e) {
        // cross-browser wheel delta
        e = window.event || e; // old IE support
        //var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

        var o = e,
            d = o.detail, w = o.wheelDelta,
            n = 225, n1 = n-1;

        // Normalize delta: http://stackoverflow.com/a/13650579/2285811
        var f;
        d = d ? w && (f = w/d) ? d/f : -d/1.35 : w/120;
        // Quadratic scale if |d| > 1
        d = d < 1 ? d < -1 ? (-Math.pow(d, 2) - n1) / n : d : (Math.pow(d, 2) + n1) / n;
        // Delta *should* not be greater than 2...
        var delta = Math.min(Math.max(d / 2, -1), 1);

        var out = delta >= 0;
        if(typeof lastMoveX !== 'undefined'){
            that.zoom(lastMoveX, lastMoveY, out, undefined, undefined, delta);
        }

        e.preventDefault();
    }

    if (el.addEventListener) {
        el.addEventListener("mousewheel", MouseWheelHandler, false); // IE9, Chrome, Safari, Opera
        el.addEventListener("DOMMouseScroll", MouseWheelHandler, false); // Firefox
    } else {
        el.attachEvent("onmousewheel", MouseWheelHandler); // IE 6/7/8
    }

    this.centerCamera(0, 0);
};

WebGLRenderer.prototype.zoom = function(x, y, zoomOut, actualScaleX, actualScaleY, multiplier){
    var scrollFactor = this.scrollFactor,
        stage = this.stage;

    if(typeof actualScaleX === 'undefined'){

        if(!zoomOut){
            scrollFactor *= -1;
        }

        scrollFactor *= Math.abs(multiplier);

        stage.scale.x *= (1 + scrollFactor);
        stage.scale.y *= (1 + scrollFactor);
        stage.position.x += (scrollFactor) * (stage.position.x - x);
        stage.position.y += (scrollFactor) * (stage.position.y - y);
    } else {
        stage.scale.x *= actualScaleX;
        stage.scale.y *= actualScaleY;
        stage.position.x += (actualScaleX - 1) * (stage.position.x - x);
        stage.position.y += (actualScaleY - 1) * (stage.position.y - y);
    }

    stage.updateTransform();
};

WebGLRenderer.prototype.centerCamera = function(x, y){
    this.stage.position.x = this.renderer.width / 2 - this.stage.scale.x * x;
    this.stage.position.y = this.renderer.height / 2 - this.stage.scale.y * y;
};

/**
 * Make sure that a rectangle is visible in the canvas.
 * @param  {number} centerX
 * @param  {number} centerY
 * @param  {number} width
 * @param  {number} height
 */
WebGLRenderer.prototype.frame = function(centerX, centerY, width, height){
    var ratio = this.renderer.width / this.renderer.height;
    if(ratio < width / height){
        this.stage.scale.x = this.renderer.width / width;
        this.stage.scale.y = -this.stage.scale.x;
    } else {
        this.stage.scale.y = -this.renderer.height / height;
        this.stage.scale.x = -this.stage.scale.y;
    }
    this.centerCamera(centerX, centerY);
};

WebGLRenderer.prototype.frameAll = function(){
    var aabb = new p2.AABB();
    var max = 1e6;
    for (var i = 0; i < this.bodies.length; i++) {
        var bodyAABB = this.bodies[i].getAABB();
        if(p2.vec2.dist(bodyAABB.lowerBound, bodyAABB.upperBound) < 1e6){
            aabb.extend(bodyAABB);
        }
    }
    var center = p2.vec2.create();
    p2.vec2.add(center, aabb.upperBound, aabb.lowerBound);
    p2.vec2.scale(center, center, 0.5);
    var width = aabb.upperBound[0] - aabb.lowerBound[0];
    var height = aabb.upperBound[1] - aabb.lowerBound[1];

    if(width > 1 && height > 1){
        this.frame(
            center[0], center[1],
            width * 1.5,
            height * 1.5
        );
    }
};

/**
 * Draw a circle onto a graphics object
 * @method drawCircle
 * @static
 * @param  {PIXI.Graphics} g
 * @param  {Number} x
 * @param  {Number} y
 * @param  {Number} radius
 * @param  {Number} color
 * @param  {Number} lineWidth
 */
WebGLRenderer.prototype.drawCircle = function(g,x,y,angle,radius,color,lineWidth,isSleeping){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="number" ? color : 0xffffff;
    g.lineStyle(lineWidth, 0x000000, 1);
    g.beginFill(color, isSleeping ? this.sleepOpacity : 1.0);
    g.drawCircle(x, y, radius);
    g.endFill();

    // line from center to edge
    g.moveTo(x,y);
    g.lineTo(   x + radius*Math.cos(angle),
                y + radius*Math.sin(angle) );
};

WebGLRenderer.drawSpring = function(g,restLength,color,lineWidth){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="undefined" ? 0xffffff : color;
    g.lineStyle(lineWidth, color, 1);
    if(restLength < lineWidth*10){
        restLength = lineWidth*10;
    }
    var M = 12;
    var dx = restLength/M;
    g.moveTo(-restLength/2,0);
    for(var i=1; i<M; i++){
        var x = -restLength/2 + dx*i;
        var y = 0;
        if(i<=1 || i>=M-1 ){
            // Do nothing
        } else if(i % 2 === 0){
            y -= 0.1*restLength;
        } else {
            y += 0.1*restLength;
        }
        g.lineTo(x,y);
    }
    g.lineTo(restLength/2,0);
};

/**
 * Draw a finite plane onto a PIXI.Graphics.
 * @method drawPlane
 * @param  {PIXI.Graphics} g
 * @param  {Number} x0
 * @param  {Number} x1
 * @param  {Number} color
 * @param  {Number} lineWidth
 * @param  {Number} diagMargin
 * @param  {Number} diagSize
 * @todo Should consider an angle
 */
WebGLRenderer.drawPlane = function(g, offset, angle, color, lineColor, lineWidth, diagMargin, diagSize, maxLength){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="undefined" ? 0xffffff : color;
    g.lineStyle(lineWidth, lineColor, 1);

    var max = maxLength;
    var q0 = p2.vec2.fromValues(-maxLength, 0);
    var q1 = p2.vec2.fromValues(maxLength, 0);
    var q2 = p2.vec2.fromValues(maxLength, -maxLength);
    var q3 = p2.vec2.fromValues(-maxLength, -maxLength);

    // transform points
    p2.vec2.rotate(q0, q0, angle);
    p2.vec2.rotate(q1, q1, angle);
    p2.vec2.rotate(q2, q2, angle);
    p2.vec2.rotate(q3, q3, angle);

    p2.vec2.add(q0, q0, offset);
    p2.vec2.add(q1, q1, offset);
    p2.vec2.add(q2, q2, offset);
    p2.vec2.add(q3, q3, offset);

    // Draw a fill color
    g.lineStyle(0,0,0);
    g.beginFill(color);
    g.moveTo(q0[0], q0[1]);
    g.lineTo(q1[0], q1[1]);
    g.lineTo(q2[0], q2[1]);
    g.lineTo(q3[0], q3[1]);
    g.endFill();

    // Draw the actual plane
    g.lineStyle(lineWidth,lineColor);
    g.moveTo(q0[0], q0[1]);
    g.lineTo(q1[0], q1[1]);
};


WebGLRenderer.drawLine = function(g, offset, angle, len, color, lineWidth){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="undefined" ? 0x000000 : color;
    g.lineStyle(lineWidth, color, 1);

    var startPoint = p2.vec2.fromValues(-len/2,0);
    var endPoint = p2.vec2.fromValues(len/2,0);

    p2.vec2.rotate(startPoint, startPoint, angle);
    p2.vec2.rotate(endPoint, endPoint, angle);

    p2.vec2.add(startPoint, startPoint, offset);
    p2.vec2.add(endPoint, endPoint, offset);

    g.moveTo(startPoint[0], startPoint[1]);
    g.lineTo(endPoint[0], endPoint[1]);
};

WebGLRenderer.prototype.drawCapsule = function(g, x, y, angle, len, radius, color, fillColor, lineWidth, isSleeping){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="undefined" ? 0x000000 : color;
    g.lineStyle(lineWidth, color, 1);

    var vec2 = p2.vec2;

    // Draw circles at ends
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var hl = len / 2;
    g.beginFill(fillColor, isSleeping ? this.sleepOpacity : 1.0);
    var localPos = vec2.fromValues(x, y);
    var p0 = vec2.fromValues(-hl, 0);
    var p1 = vec2.fromValues(hl, 0);
    vec2.rotate(p0, p0, angle);
    vec2.rotate(p1, p1, angle);
    vec2.add(p0, p0, localPos);
    vec2.add(p1, p1, localPos);
    g.drawCircle(p0[0], p0[1], radius);
    g.drawCircle(p1[0], p1[1], radius);
    g.endFill();

    // Draw rectangle
    var pp2 = vec2.create();
    var p3 = vec2.create();
    vec2.set(p0, -hl, radius);
    vec2.set(p1, hl, radius);
    vec2.set(pp2, hl, -radius);
    vec2.set(p3, -hl, -radius);

    vec2.rotate(p0, p0, angle);
    vec2.rotate(p1, p1, angle);
    vec2.rotate(pp2, pp2, angle);
    vec2.rotate(p3, p3, angle);

    vec2.add(p0, p0, localPos);
    vec2.add(p1, p1, localPos);
    vec2.add(pp2, pp2, localPos);
    vec2.add(p3, p3, localPos);

    g.lineStyle(lineWidth, color, 0);
    g.beginFill(fillColor, isSleeping ? this.sleepOpacity : 1.0);
    g.moveTo(p0[0], p0[1]);
    g.lineTo(p1[0], p1[1]);
    g.lineTo(pp2[0], pp2[1]);
    g.lineTo(p3[0], p3[1]);
    // g.lineTo( hl*c - radius*s + x,  hl*s - radius*c + y);
    // g.lineTo(-hl*c - radius*s + x, -hl*s - radius*c + y);
    g.endFill();

    // Draw lines in between
    for(var i=0; i<2; i++){
        g.lineStyle(lineWidth, color, 1);
        var sign = (i===0?1:-1);
        vec2.set(p0, -hl, sign*radius);
        vec2.set(p1, hl, sign*radius);
        vec2.rotate(p0, p0, angle);
        vec2.rotate(p1, p1, angle);
        vec2.add(p0, p0, localPos);
        vec2.add(p1, p1, localPos);
        g.moveTo(p0[0], p0[1]);
        g.lineTo(p1[0], p1[1]);
    }
};

// Todo angle
WebGLRenderer.prototype.drawRectangle = function(g,x,y,angle,w,h,color,fillColor,lineWidth,isSleeping){
    var path = [
        [w / 2, h / 2],
        [-w / 2, h / 2],
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
    ];

    // Rotate and add position
    for (var i = 0; i < path.length; i++) {
        var v = path[i];
        p2.vec2.rotate(v, v, angle);
        p2.vec2.add(v, v, [x, y]);
    }

    this.drawPath(g,path,color,fillColor,lineWidth,isSleeping);
};

WebGLRenderer.prototype.drawConvex = function(g,verts,triangles,color,fillColor,lineWidth,debug,offset,isSleeping){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="undefined" ? 0x000000 : color;
    if(!debug){
        g.lineStyle(lineWidth, color, 1);
        g.beginFill(fillColor, isSleeping ? this.sleepOpacity : 1.0);
        for(var i=0; i!==verts.length; i++){
            var v = verts[i],
                x = v[0],
                y = v[1];
            if(i===0){
                g.moveTo(x,y);
            } else {
                g.lineTo(x,y);
            }
        }
        g.endFill();
        if(verts.length>2){
            g.moveTo(verts[verts.length-1][0],verts[verts.length-1][1]);
            g.lineTo(verts[0][0],verts[0][1]);
        }
    } else {
        var colors = [0xff0000,0x00ff00,0x0000ff];
        for(var i=0; i!==verts.length+1; i++){
            var v0 = verts[i%verts.length],
                v1 = verts[(i+1)%verts.length],
                x0 = v0[0],
                y0 = v0[1],
                x1 = v1[0],
                y1 = v1[1];
            g.lineStyle(lineWidth, colors[i%colors.length], 1);
            g.moveTo(x0,y0);
            g.lineTo(x1,y1);
            g.drawCircle(x0,y0,lineWidth*2);
        }

        g.lineStyle(lineWidth, 0x000000, 1);
        g.drawCircle(offset[0],offset[1],lineWidth*2);
    }
};

WebGLRenderer.prototype.drawPath = function(g,path,color,fillColor,lineWidth,isSleeping){
    lineWidth = typeof(lineWidth)==="number" ? lineWidth : 1;
    color = typeof(color)==="undefined" ? 0x000000 : color;
    g.lineStyle(lineWidth, color, 1);
    if(typeof(fillColor)==="number"){
        g.beginFill(fillColor, isSleeping ? this.sleepOpacity : 1.0);
    }
    var lastx = null,
        lasty = null;
    for(var i=0; i<path.length; i++){
        var v = path[i],
            x = v[0],
            y = v[1];
        if(x !== lastx || y !== lasty){
            if(i===0){
                g.moveTo(x,y);
            } else {
                // Check if the lines are parallel
                var p1x = lastx,
                    p1y = lasty,
                    p2x = x,
                    p2y = y,
                    p3x = path[(i+1)%path.length][0],
                    p3y = path[(i+1)%path.length][1];
                var area = ((p2x - p1x)*(p3y - p1y))-((p3x - p1x)*(p2y - p1y));
                if(area !== 0){
                    g.lineTo(x,y);
                }
            }
            lastx = x;
            lasty = y;
        }
    }
    if(typeof(fillColor)==="number"){
        g.endFill();
    }

    // Close the path
    if(path.length>2 && typeof(fillColor)==="number"){
        g.moveTo(path[path.length-1][0],path[path.length-1][1]);
        g.lineTo(path[0][0],path[0][1]);
    }
};

WebGLRenderer.prototype.updateSpriteTransform = function(sprite,body){
    if(this.useInterpolatedPositions){
        sprite.position.x = body.interpolatedPosition[0];
        sprite.position.y = body.interpolatedPosition[1];
        sprite.rotation = body.interpolatedAngle;
    } else {
        sprite.position.x = body.position[0];
        sprite.position.y = body.position[1];
        sprite.rotation = body.angle;
    }
};

var tempVec0 = p2.vec2.create();
var tempVec1 = p2.vec2.create();
var tempVec2 = p2.vec2.create();

var tmpAABB = new p2.AABB();

var X = p2.vec2.fromValues(1,0),
    distVec = p2.vec2.fromValues(0,0),
    worldAnchorA = p2.vec2.fromValues(0,0),
    worldAnchorB = p2.vec2.fromValues(0,0);
WebGLRenderer.prototype.render = function(){
    var w = this.renderer.width,
        h = this.renderer.height,
        springSprites = this.springSprites,
        sprites = this.sprites;

    // Update body transforms
    for(var i=0; i!==this.bodies.length; i++){
        this.updateSpriteTransform(this.sprites[i],this.bodies[i]);
    }

    // Update graphics if the body changed sleepState
    for(var i=0; i!==this.bodies.length; i++){
        var isSleeping = (this.bodies[i].sleepState===p2.Body.SLEEPING);
        var sprite = this.sprites[i];
        var body = this.bodies[i];
        if(sprite.drawnSleeping !== isSleeping){
            sprite.clear();
            this.drawRenderable(body, sprite, sprite.drawnColor, sprite.drawnLineColor);
        }
    }

    // Update spring transforms
    for(var i=0; i!==this.springs.length; i++){
        var s = this.springs[i],
            sprite = springSprites[i],
            bA = s.bodyA,
            bB = s.bodyB;

        if(s instanceof p2.LinearSpring){
            if(this.useInterpolatedPositions){
                p2.vec2.toGlobalFrame(worldAnchorA, s.localAnchorA, bA.interpolatedPosition, bA.interpolatedAngle);
                p2.vec2.toGlobalFrame(worldAnchorB, s.localAnchorB, bB.interpolatedPosition, bB.interpolatedAngle);
            } else {
                s.getWorldAnchorA(worldAnchorA);
                s.getWorldAnchorB(worldAnchorB);
            }

            sprite.scale.y = 1;
            if(worldAnchorA[1] < worldAnchorB[1]){
                var tmp = worldAnchorA;
                worldAnchorA = worldAnchorB;
                worldAnchorB = tmp;
                sprite.scale.y = -1;
            }

            var sxA = worldAnchorA[0],
                syA = worldAnchorA[1],
                sxB = worldAnchorB[0],
                syB = worldAnchorB[1];

            // Spring position is the mean point between the anchors
            sprite.position.x = ( sxA + sxB ) / 2;
            sprite.position.y = ( syA + syB ) / 2;

            // Compute distance vector between anchors, in screen coords
            distVec[0] = sxA - sxB;
            distVec[1] = syA - syB;

            // Compute angle
            sprite.rotation = Math.acos( p2.vec2.dot(X, distVec) / p2.vec2.length(distVec) );

            // And scale
            sprite.scale.x = p2.vec2.length(distVec) / s.restLength;
        }
    }

    // Draw contacts
    if(this.drawContacts && !this.paused){
        this.contactGraphics.clear();
        this.stage.removeChild(this.contactGraphics);
        this.stage.addChild(this.contactGraphics);

        var g = this.contactGraphics;
        g.lineStyle(this.lineWidth,0x000000,1);
        for(var i=0; i!==this.world.narrowphase.contactEquations.length; i++){
            var eq = this.world.narrowphase.contactEquations[i],
                bi = eq.bodyA,
                bj = eq.bodyB,
                ri = eq.contactPointA,
                rj = eq.contactPointB,
                xi = bi.position[0],
                yi = bi.position[1],
                xj = bj.position[0],
                yj = bj.position[1];

            g.moveTo(xi,yi);
            g.lineTo(xi+ri[0], yi+ri[1]);

            g.moveTo(xj,yj);
            g.lineTo(xj+rj[0], yj+rj[1]);

        }
        this.contactGraphics.cleared = false;
    } else if(!this.contactGraphics.cleared){
        this.contactGraphics.clear();
        this.contactGraphics.cleared = true;
    }


    // Draw constraints
    if(this.drawConstraints){
        this.constraintsGraphics.clear();

        // Put on top - todo: only when adding / removing stuff to scene
        this.stage.removeChild(this.constraintsGraphics);
        this.stage.addChild(this.constraintsGraphics);

        var g = this.constraintsGraphics;
        g.lineStyle(this.lineWidth,0x000000,1);
        for(var i=0; i!==this.world.constraints.length; i++){
            var constraint = this.world.constraints[i],
                bi = constraint.bodyA,
                bj = constraint.bodyB,
                xi = bi.position,
                xj = bj.position;

            if(!bi.world || !bj.world) break;

            var ri = tempVec0;
            var rj = tempVec1;
            var axis = tempVec2;

            if(constraint instanceof p2.DistanceConstraint){

                p2.vec2.copy(ri, constraint.localAnchorA);
                p2.vec2.copy(rj, constraint.localAnchorB);

                bi.toWorldFrame(ri, ri);
                bj.toWorldFrame(rj, rj);

                // Dunno why, but sometines a single line strip dont work
                g.moveTo(xi[0], xi[1]);
                g.lineTo(ri[0], ri[1]);

                g.moveTo(xj[0], xj[1]);
                g.lineTo(rj[0], rj[1]);

                g.moveTo(ri[0], ri[1]);
                g.lineTo(rj[0], rj[1]);

                g.drawCircle(ri[0], ri[1], this.lineWidth * 3);
                g.drawCircle(rj[0], rj[1], this.lineWidth * 3);

            } else if(constraint instanceof p2.RevoluteConstraint && constraint !== this.mouseConstraint){

                p2.vec2.copy(ri, constraint.pivotA);
                p2.vec2.copy(rj, constraint.pivotB);

                bi.toWorldFrame(ri, ri);
                bj.toWorldFrame(rj, rj);

                g.moveTo(xi[0], xi[1]);
                g.lineTo(ri[0], ri[1]);

                g.moveTo(xj[0], xj[1]);
                g.lineTo(rj[0], rj[1]);

                g.moveTo(ri[0], ri[1]);
                g.lineTo(rj[0], rj[1]);

                g.drawCircle(ri[0], ri[1], this.lineWidth * 3);
                g.drawCircle(rj[0], rj[1], this.lineWidth * 3);

            } else if(constraint instanceof p2.LockConstraint){

                // Just a line in between for now
                g.moveTo(xi[0], xi[1]);
                g.lineTo(xj[0], xj[1]);

            } else if(constraint instanceof p2.PrismaticConstraint){

                p2.vec2.copy(ri, constraint.localAnchorA);
                p2.vec2.copy(rj, constraint.localAnchorB);
                p2.vec2.copy(axis, constraint.localAxisA);

                bi.toWorldFrame(ri, ri);
                bj.toWorldFrame(rj, rj);
                p2.vec2.rotate(axis, axis, bi.angle);

                // AnchorA
                g.moveTo(xi[0], xi[1]);
                g.lineTo(ri[0], ri[1]);

                // AnchorB
                g.moveTo(xj[0], xj[1]);
                g.lineTo(rj[0], rj[1]);

                // AxisA
                g.moveTo(ri[0], ri[1]);
                g.lineTo(ri[0] + axis[0], ri[1] + axis[1]);
            }

        }
        this.constraintsGraphics.cleared = false;
    } else if(!this.constraintsGraphics.cleared){
        this.constraintsGraphics.clear();
        this.constraintsGraphics.cleared = true;
    }


    // Draw AABBs
    if(this.drawAABBs){
        this.aabbGraphics.clear();
        this.stage.removeChild(this.aabbGraphics);
        this.stage.addChild(this.aabbGraphics);
        var g = this.aabbGraphics;
        g.lineStyle(this.lineWidth,0x000000,1);

        for(var i=0; i!==this.world.bodies.length; i++){
            var aabb = this.world.bodies[i].getAABB();
            g.drawRect(aabb.lowerBound[0], aabb.lowerBound[1], aabb.upperBound[0] - aabb.lowerBound[0], aabb.upperBound[1] - aabb.lowerBound[1]);
        }
        this.aabbGraphics.cleared = false;
    } else if(!this.aabbGraphics.cleared){
        this.aabbGraphics.clear();
        this.aabbGraphics.cleared = true;
    }

    // Draw selection
    // TODO: only change when selection changed
    var g = this.selectionGraphics;
    g.clear();
    this.stage.removeChild(g);
    this.stage.addChild(g);
    g.lineStyle(this.lineWidth * 3, 0x000000,1);
    for(var i=0; this.paused && i!==this.selection.length; i++){
        var object = this.selection[i];

        if(object instanceof p2.Body && object.shapes.length){
            var aabb = object.getAABB();
            g.drawRect(
                aabb.lowerBound[0],
                aabb.lowerBound[1],
                aabb.upperBound[0] - aabb.lowerBound[0],
                aabb.upperBound[1] - aabb.lowerBound[1]
            );
        }

        if(object instanceof p2.Shape){
            // Get body of shape
            var bodyObject;
            var shapeObject;
            var shapeOffset = [0,0];
            var shapeAngle = 0;
            var world = this.world;
            for(var k=0; k<world.bodies.length; k++){
                var body = world.bodies[k];
                for(var j=0; j<body.shapes.length; j++){
                    var shape = body.shapes[j];
                    if(shape.id === object.id){
                        bodyObject = body;
                        shapeObject = shape;
                        p2.vec2.copy(shapeOffset, body.shapeOffsets[j]);
                        shapeAngle = body.shapeAngles[j];
                        break;
                    }
                }
            }

            if(bodyObject){
                bodyObject.toWorldFrame(shapeOffset, shapeOffset);
                shapeObject.computeAABB(tmpAABB, shapeOffset, bodyObject.angle + shapeAngle);
                g.drawRect(
                    tmpAABB.lowerBound[0],
                    tmpAABB.lowerBound[1],
                    tmpAABB.upperBound[0] - tmpAABB.lowerBound[0],
                    tmpAABB.upperBound[1] - tmpAABB.lowerBound[1]
                );
            }
        }
    }

    this.renderer.render(this.container);
};

//http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return componentToHex(r) + componentToHex(g) + componentToHex(b);
}
//http://stackoverflow.com/questions/43044/algorithm-to-randomly-generate-an-aesthetically-pleasing-color-palette
function randomPastelHex(){
    var mix = [255,255,255];
    var red =   Math.floor(Math.random()*256);
    var green = Math.floor(Math.random()*256);
    var blue =  Math.floor(Math.random()*256);

    // mix the color
    red =   Math.floor((red +   3*mix[0]) / 4);
    green = Math.floor((green + 3*mix[1]) / 4);
    blue =  Math.floor((blue +  3*mix[2]) / 4);

    return rgbToHex(red,green,blue);
}

WebGLRenderer.prototype.drawRenderable = function(obj, graphics, color, lineColor){
    var lw = this.lineWidth;

    var zero = [0,0];
    graphics.drawnSleeping = false;
    graphics.drawnColor = color;
    graphics.drawnLineColor = lineColor;

    if(obj instanceof p2.Body && obj.shapes.length){

        var isSleeping = (obj.sleepState === p2.Body.SLEEPING);
        graphics.drawnSleeping = isSleeping;

        if(obj.concavePath && !this.debugPolygons){
            var path = [];
            for(var j=0; j!==obj.concavePath.length; j++){
                var v = obj.concavePath[j];
                path.push([v[0], v[1]]);
            }
            this.drawPath(graphics, path, lineColor, color, lw, isSleeping);
        } else {
            for(var i=0; i<obj.shapes.length; i++){
                var child = obj.shapes[i],
                    offset = obj.shapeOffsets[i],
                    angle = obj.shapeAngles[i];
                offset = offset || zero;
                angle = angle || 0;

                if(child instanceof p2.Circle){
                    this.drawCircle(graphics, offset[0], offset[1], angle, child.radius,child.color,lw,isSleeping);

                } else if(child instanceof p2.Particle){
                    this.drawCircle(graphics, offset[0], offset[1], angle, 2*lw, lineColor, 0);

                } else if(child instanceof p2.Plane){
                    WebGLRenderer.drawPlane(graphics, offset, angle, child.color, lineColor, lw, lw*10, lw*10, 1e3);

                } else if(child instanceof p2.Line){
                    WebGLRenderer.drawLine(graphics, offset, angle, child.length, lineColor, lw);

                } else if(child instanceof p2.Rectangle){
                    this.drawRectangle(graphics, offset[0], offset[1], angle, child.width, child.height, lineColor, child.color, lw, isSleeping);

                } else if(child instanceof p2.Capsule){
                    this.drawCapsule(graphics, offset[0], offset[1], angle, child.length, child.radius, lineColor, child.color, lw, isSleeping);

                } else if(child instanceof p2.Convex){
                    // Scale verts
                    var verts = [],
                        vrot = p2.vec2.create();
                    for(var j=0; j!==child.vertices.length; j++){
                        var v = child.vertices[j];
                        p2.vec2.rotate(vrot, v, angle);
                        verts.push([(vrot[0]+offset[0]), (vrot[1]+offset[1])]);
                    }
                    this.drawConvex(graphics, verts, child.triangles, lineColor, child.color, lw, this.debugPolygons,[offset[0],-offset[1]], isSleeping);

                } else if(child instanceof p2.Heightfield){
                    var path = [[0,-100]];
                    for(var j=0; j!==child.data.length; j++){
                        var v = child.data[j];
                        path.push([j*child.elementWidth, v]);
                    }
                    path.push([child.data.length*child.elementWidth,-100]);
                    this.drawPath(graphics, path, lineColor, child.color, lw, isSleeping);

                }
            }
        }

    } else if(obj instanceof p2.LinearSpring){
        var restLengthPixels = obj.restLength;
        WebGLRenderer.drawSpring(graphics,restLengthPixels,0x000000,lw);
    }
};

WebGLRenderer.prototype.addRenderable = function(obj){
    var lw = this.lineWidth;

    // Random color
    var color = parseInt(randomPastelHex(),16),
        lineColor = 0x000000;

    var zero = [0,0];

    var sprite = new PIXI.Graphics();
    if(obj instanceof p2.Body && obj.shapes.length){

        this.drawRenderable(obj, sprite, color, lineColor);
        this.sprites.push(sprite);
        this.stage.addChild(sprite);

    } else if(obj instanceof p2.Spring){
        this.drawRenderable(obj, sprite, 0x000000, lineColor);
        this.springSprites.push(sprite);
        this.stage.addChild(sprite);
    }
};

WebGLRenderer.prototype.removeRenderable = function(obj){
    if(obj instanceof p2.Body){
        var i = this.bodies.indexOf(obj);
        if(i!==-1){
            this.stage.removeChild(this.sprites[i]);
            this.sprites.splice(i,1);
        }
        // TODO: remove springs connected
    } else if(obj instanceof p2.Spring){
        var i = this.springs.indexOf(obj);
        if(i!==-1){
            this.stage.removeChild(this.springSprites[i]);
            this.springSprites.splice(i,1);
        }
    }
};

WebGLRenderer.prototype.resize = function(w,h){
    var renderer = this.renderer;
    var view = renderer.view;
    var ratio = w / h;
    renderer.resize(w, h);
};
