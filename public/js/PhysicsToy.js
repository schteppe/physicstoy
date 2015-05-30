/**
 * @class Color
 */
function Color(){

}

//http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
Color.componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
};

/**
 * Returns a string HEX code, for example "FF0000"
 * @param  {number} r A number between 0 and 255
 * @param  {number} g
 * @param  {number} b
 * @return {string}
 */
Color.rgbToHex = function(r, g, b) {
    return Color.componentToHex(r) + Color.componentToHex(g) + Color.componentToHex(b);
};

/**
 * http://stackoverflow.com/questions/43044/algorithm-to-randomly-generate-an-aesthetically-pleasing-color-palette
 * @return {string}
 */
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

// shim layer with setTimeout fallback
var requestAnimFrame =  window.requestAnimationFrame       ||
                        window.webkitRequestAnimationFrame ||
                        window.mozRequestAnimationFrame    ||
                        window.oRequestAnimationFrame      ||
                        window.msRequestAnimationFrame     ||
                        function( callback ){
                            window.setTimeout(callback, 1000 / 60);
                        };

var disableSelectionCSS = [
    "-ms-user-select: none",
    "-moz-user-select: -moz-none",
    "-khtml-user-select: none",
    "-webkit-user-select: none",
    "user-select: none"
];

/**
 * Base class for rendering a p2 physics scene.
 * @class Renderer
 * @constructor
 */
function Renderer(world, options){
    p2.EventEmitter.call(this);

    options = options || {};

    this.setWorld(world);

    // Expose globally
    window.app = this;

    var that = this;

    this.state = Renderer.DEFAULT;
    this.defaultState = Renderer.DEFAULT;

    // Bodies to draw
    this.bodies=[];
    this.springs=[];
    this.timeStep = 1/60;
    this.resetTime = false;
    this.relaxation = p2.Equation.DEFAULT_RELAXATION;
    this.stiffness = p2.Equation.DEFAULT_STIFFNESS;
    this.maxSubSteps = 3;

    this.mouseConstraint = null;
    this.nullBody = new p2.Body();
    this.pickPrecision = 5;
    this.lastMouseDownPhysicsPosition = p2.vec2.create();

    this.useInterpolatedPositions = false;

    this.drawPoints = [];
    this.drawAABBs = false;
    this.drawPointsChangeEvent = { type : "drawPointsChange" };
    this.drawCircleCenter = p2.vec2.create();
    this.drawCirclePoint = p2.vec2.create();
    this.drawCircleChangeEvent = { type : "drawCircleChange" };
    this.drawRectangleChangeEvent = { type : "drawRectangleChange" };
    this.drawRectStart = p2.vec2.create();
    this.drawRectEnd = p2.vec2.create();

    this.stateChangeEvent = { type : "stateChange", state:null };
    this.selectionChangeEvent = { type : "selectionChange" };

    this.selection = [];
    this.selectionEnabled = false;

    // Default collision masks for new shapes
    this.newShapeCollisionMask = 1;
    this.newShapeCollisionGroup = 1;

    // If constraints should be drawn
    this.drawConstraints = false;

    this.stats_sum = 0;
    this.stats_N = 100;
    this.stats_Nsummed = 0;
    this.stats_average = -1;

    this.addedGlobals = [];

    this.settings = {
        tool: Renderer.DEFAULT,
        fullscreen: function(){
            var el = document.body;
            var requestFullscreen = el.requestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen || el.webkitRequestFullscreen;
            if(requestFullscreen){
                requestFullscreen.call(el);
            }
        },

        'paused [p]': false,
        'manualStep [s]': function(){ that.world.step(that.world.lastTimeStep); },
        fps: 60,
        maxSubSteps: 3,
        gravityX: 0,
        gravityY: -10,
        sleepMode: p2.World.NO_SLEEPING,

        'drawContacts [c]': false,
        'drawAABBs [t]': false,
        drawConstraints: false,

        iterations: 10,
        stiffness: 1000000,
        relaxation: 4,
        tolerance: 0.0001,
    };

    this.init();
    this.resizeToFit();
    this.render();
    this.centerCamera(0, 0);
    this.paused = true;

    window.onresize = function(){
        that.resizeToFit();
    };

    this.setUpKeyboard();
    this.startRenderingLoop();
    //this.addFullScreenButton();
}
Renderer.prototype = new p2.EventEmitter();

Renderer.DEFAULT =            1;
Renderer.PANNING =            2;
Renderer.DRAGGING =           3;
Renderer.DRAWPOLYGON =        4;
Renderer.DRAWINGPOLYGON  =    5;
Renderer.DRAWCIRCLE =         6;
Renderer.DRAWINGCIRCLE  =     7;
Renderer.DRAWRECTANGLE =      8;
Renderer.DRAWINGRECTANGLE =   9;
Renderer.PANZOOM =           10;

Renderer.toolStateMap = {
    'pick/pan [q]': Renderer.DEFAULT,
    'polygon [d]': Renderer.DRAWPOLYGON,
    'circle [a]': Renderer.DRAWCIRCLE,
    'rectangle [f]': Renderer.DRAWRECTANGLE
};
Renderer.stateToolMap = {};
for(var key in Renderer.toolStateMap){
    Renderer.stateToolMap[Renderer.toolStateMap[key]] = key;
}

Renderer.keydownEvent = {
    type:"keydown",
    originalEvent : null,
    keyCode : 0,
};
Renderer.keyupEvent = {
    type:"keyup",
    originalEvent : null,
    keyCode : 0,
};

Object.defineProperty(Renderer.prototype, 'drawContacts', {
    get: function() {
        return this.settings['drawContacts [c]'];
    },
    set: function(value) {
        this.settings['drawContacts [c]'] = value;
    }
});

Object.defineProperty(Renderer.prototype, 'paused', {
    get: function() {
        return this.settings['paused [p]'];
    },
    set: function(value) {
        this.settings['paused [p]'] = value;
    }
});

Renderer.prototype.getDevicePixelRatio = function() {
    return window.devicePixelRatio || 1;
};

Renderer.prototype.resizeToFit = function(){
    var dpr = this.getDevicePixelRatio();
    //var rect = this.elementContainer.getBoundingClientRect();
    var w = window.innerWidth * dpr;
    var h = window.innerHeight * dpr;
    this.resize(w, h);
};

Renderer.prototype.setWorld = function(world){
    this.world = world;

    window.world = world; // For debugging.

    var that = this;

    world.on("postStep",function(e){
        that.updateStats();
    }).on("addBody",function(e){
        that.addVisual(e.body);
    }).on("removeBody",function(e){
        that.removeVisual(e.body);
    }).on("addSpring",function(e){
        that.addVisual(e.spring);
    }).on("removeSpring",function(e){
        that.removeVisual(e.spring);
    });
};

Renderer.elementClass = 'p2-canvas';
Renderer.containerClass = 'p2-container';

Renderer.prototype.clearSelection = function() {
    var prevLength = this.selection.length;
    this.selection.length = 0;
    this.emit(this.selectionChangeEvent);
};

Renderer.prototype.enableSelection = function() {
    this.selectionEnabled = true;
};

Renderer.prototype.disableSelection = function() {
    this.clearSelection();
    this.selectionEnabled = true;
};

Renderer.prototype.toggleSelect = function(object) {
    var selection = this.selection;
    var idx = selection.indexOf(object);
    if(idx === -1){
        selection.push(object);
    } else {
        selection.splice(idx, 1);
    }
    this.emit(this.selectionChangeEvent);
};

Renderer.prototype.removeFromSelection = function(object){
    var selection = this.selection;
    var idx = selection.indexOf(object);
    if(idx !== -1){
        selection.splice(idx, 1);
        this.emit(this.selectionChangeEvent);
    }
};

/**
 * Adds all needed keyboard callbacks
 */
Renderer.prototype.setUpKeyboard = function() {
    var that = this;

    this.elementContainer.onkeydown = function(e){
        if(!e.keyCode){
            return;
        }
        var s = that.state;
        var ch = String.fromCharCode(e.keyCode);
        switch(ch){
        case "P": // pause
            that.paused = !that.paused;
            break;
        case "S": // step
            that.world.step(that.world.lastTimeStep);
            break;
        case "C": // toggle draw contacts & constraints
            that.drawContacts = !that.drawContacts;
            that.drawConstraints = !that.drawConstraints;
            break;
        case "T": // toggle draw AABBs
            that.drawAABBs = !that.drawAABBs;
            break;
        case "Q": // set default
            that.setState(that.defaultState);
            break;
        default:
            Renderer.keydownEvent.keyCode = e.keyCode;
            Renderer.keydownEvent.originalEvent = e;
            that.emit(Renderer.keydownEvent);
            break;
        }
    };

    this.elementContainer.onkeyup = function(e){
        if(e.keyCode){
            switch(String.fromCharCode(e.keyCode)){
            default:
                Renderer.keyupEvent.keyCode = e.keyCode;
                Renderer.keyupEvent.originalEvent = e;
                that.emit(Renderer.keyupEvent);
                break;
            }
        }
    };
};

/**
 * Start the rendering loop
 */
Renderer.prototype.startRenderingLoop = function(){
    var that = this,
        lastCallTime = Date.now() / 1000;

    function update(){
        if(!that.paused){
            var now = Date.now() / 1000,
                timeSinceLastCall = now - lastCallTime;
            lastCallTime = now;
            if(that.resetTime){
                timeSinceLastCall = 0;
                that.resetTime = false;
                that.world.time = 0;
            }
            that.world.step(that.timeStep, timeSinceLastCall, that.maxSubSteps);
        }
        that.render();
        requestAnimFrame(update);
    }
    requestAnimFrame(update);
};

/**
 * Set the app state.
 * @param {number} state
 */
Renderer.prototype.setState = function(state){
    this.state = state;
    this.stateChangeEvent.state = state;
    this.emit(this.stateChangeEvent);
    if(Renderer.stateToolMap[state]){
        this.settings.tool = state;
    }
};

/**
 * Should be called by subclasses whenever there's a mousedown event
 */
Renderer.prototype.handleMouseDown = function(physicsPosition){
    switch(this.state){

    case Renderer.DEFAULT:

        // Check if the clicked point overlaps bodies
        var result = this.world.hitTest(physicsPosition, this.world.bodies, this.pickPrecision);

        // Remove static bodies
        var b;
        while(result.length > 0){
            b = result.shift();
            if(b.type === p2.Body.STATIC){
                b = null;
            } else {
                break;
            }
        }

        if(b){
            b.wakeUp();
            this.setState(Renderer.DRAGGING);
            // Add mouse joint to the body
            var localPoint = p2.vec2.create();
            b.toLocalFrame(localPoint,physicsPosition);
            this.world.addBody(this.nullBody);
            this.mouseConstraint = new p2.RevoluteConstraint(this.nullBody, b, {
                localPivotA: physicsPosition,
                localPivotB: localPoint
            });
            this.world.addConstraint(this.mouseConstraint);
        } else {
            this.setState(Renderer.PANNING);
        }
        break;

    case Renderer.PANZOOM:
        this.setState(Renderer.PANNING);
        break;

    case Renderer.DRAWPOLYGON:
        // Start drawing a polygon
        this.setState(Renderer.DRAWINGPOLYGON);
        this.drawPoints = [];
        var copy = p2.vec2.create();
        p2.vec2.copy(copy,physicsPosition);
        this.drawPoints.push(copy);
        this.emit(this.drawPointsChangeEvent);
        break;

    case Renderer.DRAWCIRCLE:
        // Start drawing a circle
        this.setState(Renderer.DRAWINGCIRCLE);
        p2.vec2.copy(this.drawCircleCenter,physicsPosition);
        p2.vec2.copy(this.drawCirclePoint, physicsPosition);
        this.emit(this.drawCircleChangeEvent);
        break;

    case Renderer.DRAWRECTANGLE:
        // Start drawing a circle
        this.setState(Renderer.DRAWINGRECTANGLE);
        p2.vec2.copy(this.drawRectStart,physicsPosition);
        p2.vec2.copy(this.drawRectEnd, physicsPosition);
        this.emit(this.drawRectangleChangeEvent);
        break;
    }

    // Store for next
    p2.vec2.copy(this.lastMouseDownPhysicsPosition, physicsPosition);
};

/**
 * Should be called by subclasses whenever there's a mousedown event
 */
Renderer.prototype.handleMouseMove = function(physicsPosition){
    var sampling = 0.4;
    switch(this.state){
    case Renderer.DEFAULT:
    case Renderer.DRAGGING:
        if(this.mouseConstraint){
            p2.vec2.copy(this.mouseConstraint.pivotA, physicsPosition);
            this.mouseConstraint.bodyA.wakeUp();
            this.mouseConstraint.bodyB.wakeUp();
        }
        break;

    case Renderer.DRAWINGPOLYGON:
        // drawing a polygon - add new point
        var sqdist = p2.vec2.dist(physicsPosition,this.drawPoints[this.drawPoints.length-1]);
        if(sqdist > sampling*sampling){
            var copy = [0,0];
            p2.vec2.copy(copy,physicsPosition);
            this.drawPoints.push(copy);
            this.emit(this.drawPointsChangeEvent);
        }
        break;

    case Renderer.DRAWINGCIRCLE:
        // drawing a circle - change the circle radius point to current
        p2.vec2.copy(this.drawCirclePoint, physicsPosition);
        this.emit(this.drawCircleChangeEvent);
        break;

    case Renderer.DRAWINGRECTANGLE:
        // drawing a rectangle - change the end point to current
        p2.vec2.copy(this.drawRectEnd, physicsPosition);
        this.emit(this.drawRectangleChangeEvent);
        break;
    }
};

/**
 * Should be called by subclasses whenever there's a mouseup event
 */
Renderer.prototype.handleMouseUp = function(physicsPosition){

    var b;

    switch(this.state){

    case Renderer.DEFAULT:
    case Renderer.PANZOOM:
        break;

    case Renderer.DRAGGING:
        // Drop constraint
        this.world.removeConstraint(this.mouseConstraint);
        this.mouseConstraint = null;
        this.world.removeBody(this.nullBody);
        this.setState(this.defaultState);
        break;

    case Renderer.PANNING:
        this.setState(this.defaultState);
        break;

    case Renderer.DRAWINGPOLYGON:
        // End this drawing state
        this.setState(Renderer.DRAWPOLYGON);
        if(this.drawPoints.length > 3){
            // Create polygon
            b = new p2.Body({ mass : 1 });
            if(b.fromPolygon(this.drawPoints,{
                removeCollinearPoints : 0.01,
            })){
                this.world.addBody(b);
            }
        }
        this.drawPoints = [];
        this.emit(this.drawPointsChangeEvent);
        break;

    case Renderer.DRAWINGCIRCLE:
        // End this drawing state
        this.setState(Renderer.DRAWCIRCLE);
        var R = p2.vec2.dist(this.drawCircleCenter,this.drawCirclePoint);
        if(R > 0){
            // Create circle
            b = new p2.Body({ mass : 1, position : this.drawCircleCenter });
            var circle = new p2.Circle(R);
            b.addShape(circle);
            this.world.addBody(b);
        }
        p2.vec2.copy(this.drawCircleCenter,this.drawCirclePoint);
        this.emit(this.drawCircleChangeEvent);
        break;

    case Renderer.DRAWINGRECTANGLE:
        // End this drawing state
        this.setState(Renderer.DRAWRECTANGLE);
        // Make sure first point is upper left
        var start = this.drawRectStart;
        var end = this.drawRectEnd;
        for(var i=0; i<2; i++){
            if(start[i] > end[i]){
                var tmp = end[i];
                end[i] = start[i];
                start[i] = tmp;
            }
        }
        var width = Math.abs(start[0] - end[0]);
        var height = Math.abs(start[1] - end[1]);
        if(width > 0 && height > 0){
            // Create box
            b = new p2.Body({
                mass : 1,
                position : [this.drawRectStart[0] + width*0.5, this.drawRectStart[1] + height*0.5]
            });
            var rectangleShape = new p2.Rectangle(width, height);
            b.addShape(rectangleShape);
            this.world.addBody(b);
        }
        p2.vec2.copy(this.drawRectEnd,this.drawRectStart);
        this.emit(this.drawRectangleChangeEvent);
        break;
    }

    if(b){
        b.wakeUp();
        for(var i=0; i<b.shapes.length; i++){
            var s = b.shapes[i];
            s.collisionMask =  this.newShapeCollisionMask;
            s.collisionGroup = this.newShapeCollisionGroup;
        }
    }
};

p2.World.prototype.hitTest2 = function(worldPoint,bodies,precision){
    precision = precision || 0;

    // Create a dummy particle body with a particle shape to test against the bodies
    var pb = new p2.Body({ position:worldPoint }),
        ps = new p2.Particle(),
        px = worldPoint,
        pa = 0,
        x = [0,0],
        zero = [0,0],
        tmp = [0,0];
    pb.addShape(ps);

    var n = this.narrowphase,
        result = [];

    // Check bodies
    for(var i=0, N=bodies.length; i!==N; i++){
        var b = bodies[i];
        for(var j=0, NS=b.shapes.length; j!==NS; j++){
            var s = b.shapes[j],
                offset = b.shapeOffsets[j] || zero,
                angle = b.shapeAngles[j] || 0.0;

            // Get shape world position + angle
            p2.vec2.rotate(x, offset, b.angle);
            p2.vec2.add(x, x, b.position);
            var a = angle + b.angle;

            if( (s instanceof p2.Circle    && n.circleParticle  (b,s,x,a,     pb,ps,px,pa, true)) ||
                (s instanceof p2.Convex    && n.particleConvex  (pb,ps,px,pa, b,s,x,a,     true)) ||
                (s instanceof p2.Plane     && n.particlePlane   (pb,ps,px,pa, b,s,x,a,     true)) ||
                (s instanceof p2.Capsule   && n.particleCapsule (pb,ps,px,pa, b,s,x,a,     true)) ||
                (s instanceof p2.Particle  && p2.vec2.squaredLength(vec2.sub(tmp,x,worldPoint)) < precision*precision)
                ){
                result.push(s);
            }
        }
    }

    return result;
};

Renderer.prototype.handleClick = function(physicsPosition){
    var result = this.world.hitTest(physicsPosition, this.world.bodies, this.pickPrecision);
    var result2 = this.world.hitTest2(physicsPosition, this.world.bodies, this.pickPrecision);
    this.emit({
        type: 'click',
        targets: result.concat(result2)
    });
};

Renderer.prototype.handleDoubleClick = function(physicsPosition){
    var result = this.world.hitTest(physicsPosition, this.world.bodies, this.pickPrecision);
    var result2 = this.world.hitTest2(physicsPosition, this.world.bodies, this.pickPrecision);
    this.emit({
        type: 'dblclick',
        targets: result.concat(result2)
    });
};

/**
 * Update stats
 */
Renderer.prototype.updateStats = function(){
    this.stats_sum += this.world.lastStepTime;
    this.stats_Nsummed++;
    if(this.stats_Nsummed === this.stats_N){
        this.stats_average = this.stats_sum/this.stats_N;
        this.stats_sum = 0.0;
        this.stats_Nsummed = 0;
    }
    /*
    this.stats_stepdiv.innerHTML = "Physics step: "+(Math.round(this.stats_average*100)/100)+"ms";
    this.stats_contactsdiv.innerHTML = "Contacts: "+this.world.narrowphase.contactEquations.length;
    */
};

/**
 * Add an object to the demo
 * @param  {mixed} obj Either Body or Spring
 */
Renderer.prototype.addVisual = function(obj){
    if(obj instanceof p2.Spring && this.springs.indexOf(obj) === -1){
        this.springs.push(obj);
        this.addRenderable(obj);
    } else if(obj instanceof p2.Body && this.bodies.indexOf(obj) === -1 && obj.shapes.length){
        this.bodies.push(obj);
        this.addRenderable(obj);
    }
};

/**
 * Removes all visuals from the scene
 */
Renderer.prototype.removeAllVisuals = function(){
    var bodies = this.bodies,
        springs = this.springs;
    while(bodies.length){
        this.removeVisual(bodies[bodies.length-1]);
    }
    while(springs.length){
        this.removeVisual(springs[springs.length-1]);
    }
};

/**
 * Remove an object from the demo
 * @param  {mixed} obj Either Body or Spring
 */
Renderer.prototype.removeVisual = function(obj){
    this.removeRenderable(obj);
    if(obj instanceof p2.Spring){
        var idx = this.springs.indexOf(obj);
        if(idx !== -1){
            this.springs.splice(idx,1);
        }
    } else if(obj instanceof p2.Body){
        var idx = this.bodies.indexOf(obj);
        if(idx !== -1){
            this.bodies.splice(idx,1);
        }
    } else {
        console.warn("Renderer.prototype.removeVisual: Visual type not recognized...");
    }
};

Renderer.prototype.addFullScreenButton = function(){
    var el = document.createElement('div');
    el.innerHTML = '<a onclick="window.screenfull && screenfull.request()" class="fullscreen-button"><img src="/img/fullscreen.png"/></a>';
    document.body.appendChild(el);
};

Renderer.zoomInEvent = {
    type:"zoomin"
};
Renderer.zoomOutEvent = {
    type:"zoomout"
};

Renderer.prototype.setEquationParameters = function(){
    this.world.setGlobalEquationParameters({
        stiffness: this.settings.stiffness,
        relaxation: this.settings.relaxation
    });
};
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
                that.handleDoubleClick(init_physicsPosition);
            else
                that.handleClick(init_physicsPosition);
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

            if(constraint instanceof p2.DistanceConstraint){
                var ri = tempVec0;//p2.vec2.create();
                var rj = tempVec1;//p2.vec2.create();

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

function Handler(){
	this.objects = {};
}
Handler.idCounter = 1;

Handler.prototype.getById = function(id){
	return this.objects[id];
};

Handler.prototype.update = function(config){};

Handler.prototype.add = function(config){};

Handler.prototype.remove = function(config){
	delete this.objects[config.id];
};

Handler.prototype.create = function(){};

Handler.prototype.createId = function(){
	return Handler.idCounter++;
};

Handler.prototype.getIdOf = function(obj){
	for(var id in this.objects){
		if(this.objects[id] === obj){
			return parseInt(id, 10);
		}
	}
	return -1;
};

Handler.prototype.duplicate = function(config){
	var newConfig = this.create();
	var id = newConfig.id;
	for(var key in newConfig){
		newConfig[key] = config[key];
	}
	newConfig.id = id;
	return newConfig;
};
function RendererHandler(renderer){
	Handler.call(this);
	this.renderer = renderer;
}
RendererHandler.prototype = Object.create(Handler.prototype);

RendererHandler.prototype.create = function(){
	return {
		contacts: false,
		aabbs: false,
		constraints: false
	};
};

RendererHandler.prototype.update = function(config){
	var renderer = this.renderer;
	renderer.drawAABBs = config.aabbs;
	renderer.drawContacts = config.contacts;
	renderer.drawConstraints = config.constraints;
};
function SolverHandler(world){
	Handler.call(this);
	this.world = world;
}
SolverHandler.prototype = Object.create(Handler.prototype);

SolverHandler.prototype.create = function(){
	return {
		iterations: 10,
		stiffness: 1000000,
		relaxation: 4,
		tolerance: 0.0001
	};
};

SolverHandler.prototype.update = function(config){
	var world = this.world;
	world.solver.iterations = config.iterations;
	world.solver.tolerance = config.tolerance;
};
function ShapeHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.world = world;
	this.renderer = renderer;
	this.sceneHandler = sceneHandler;
}
ShapeHandler.prototype = Object.create(Handler.prototype);

ShapeHandler.prototype.update = function(bodyConfig, config){
	var body = this.sceneHandler.bodyHandler.getById(bodyConfig.id);

	var shape = this.objects[config.id];
	if(!shape){
		this.add(bodyConfig, config);
		shape = this.objects[config.id];
	}

	var i = body.shapes.indexOf(shape);
	var oldColor = shape.color;

	switch(config.type){
	case 'circle':
		shape = new p2.Circle(config.radius);
		break;
	case 'box':
		shape = new p2.Rectangle(config.width, config.height);
		break;
	case 'plane':
		shape = new p2.Plane();
		break;
	case 'capsule':
		shape = new p2.Capsule(config.length, config.radius);
		break;
	}
	this.objects[config.id] = body.shapes[i] = shape;
	shape.id = config.id;
	shape.color = oldColor;

	// Hack in the color
	shape.color = parseInt(config.color.replace('#',''), 16);

	var material = this.sceneHandler.materialHandler.getById(bodyConfig.material);
	if(material){
		shape.material = material;
	}
	shape.collisionGroup = bodyConfig.collisionGroup;
	shape.collisionMask = bodyConfig.collisionMask;

	body.shapeOffsets[i].set([config.x, config.y]);
	body.shapeAngles[i] = config.angle;

	this.bodyChanged(body);
};

ShapeHandler.prototype.add = function(bodyConfig, config){
	// Get the parent body
	var body = this.sceneHandler.bodyHandler.getById(bodyConfig.id);
	var shape;
	switch(config.type){
	case 'circle':
		shape = new p2.Circle(config.radius);
		break;
	case 'box':
		shape = new p2.Rectangle(config.width, config.height);
		break;
	case 'plane':
		shape = new p2.Plane();
		break;
	case 'capsule':
		shape = new p2.Capsule(config.length, config.radius);
		break;
	}

	var material = this.sceneHandler.materialHandler.getById(bodyConfig.material);
	if(material){
		shape.material = material;
	}

	this.objects[config.id] = shape;
	body.addShape(shape, [config.x, config.y], config.angle);
	this.update(bodyConfig, config);
};

ShapeHandler.prototype.remove = function(bodyId, config){
	var shape = this.objects[config.id];
	var body = this.sceneHandler.bodyHandler.getById(bodyId);
	body.removeShape(shape);
	this.bodyChanged(body);
	delete this.objects[config.id];
};

// Call when need to rerender body and stuff
ShapeHandler.prototype.bodyChanged = function(body){

	// Update body properties
	body.updateMassProperties();
	body.updateAABB();

	// Update visuals
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

ShapeHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		name: 'Shape ' + id,

		type: 'circle', // circle, box, capsule, plane
		color: '#' + Color.randomPastelHex(),
		angle: 0,
		x: 0,
		y: 0,
		collisionResponse: true,

		// Circle, Capsule
		radius: 1,

		// Capsule
		length: 1,

		// Box
		width: 1,
		height: 1,

		// Convex
		vertices: []
	};
};
function WorldHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
WorldHandler.prototype = Object.create(Handler.prototype);

WorldHandler.prototype.update = function(config){
	var world = this.world;
	world.gravity.set([config.gravityX, config.gravityY]);
	this.renderer.maxSubSteps = config.maxSubSteps;
	this.renderer.timeStep = 1 / config.fps;
};

WorldHandler.prototype.create = function(){
	return {
		gravityX: 0,
		gravityY: -10,
		fps: 60,
		maxSubSteps: 3,
		sleepMode: "NO_SLEEPING"
	};
};
function SpringHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
SpringHandler.prototype = Object.create(Handler.prototype);

SpringHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'linear',
		name: 'Spring ' + id,
		stiffness: 100,
		damping: 1,
		bodyA: 0,
		bodyB: 0,
		useInitialRestLength: true,
		restLength: 0,

		// Linear
		localAnchorAX: 0,
		localAnchorAY: 0,
		localAnchorBX: 0,
		localAnchorBY: 0
	};
};

SpringHandler.prototype.update = function(config){
	var bodyA = this.sceneHandler.bodyHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.bodyHandler.getById(config.bodyB);

	var spring = this.objects[config.id];
	if(spring){
		this.renderer.removeVisual(spring);
		this.world.removeSpring(spring);
	}

	if(!bodyA || !bodyB) return;

	switch(config.type){
	case 'linear':
		var opts = {
			stiffness: config.stiffness,
			damping: config.damping,
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY]
		};
		if(!config.useInitialRestLength){
			opts.restLength = config.restLength;
		}
		spring = new p2.LinearSpring(bodyA, bodyB, opts);
		break;
	case 'rotational':
		var opts = {
			stiffness: config.stiffness,
			damping: config.damping
		};
		if(!config.useInitialRestLength){
			opts.restAngle = config.restLength;
		}
		spring = new p2.RotationalSpring(bodyA, bodyB, opts);
		break;
	}
	this.world.addSpring(spring);
	this.objects[config.id] = spring;
	this.renderer.addVisual(spring);
};

SpringHandler.prototype.remove = function(config){
	var spring = this.objects[config.id];
	var bodyA = this.sceneHandler.bodyHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.bodyHandler.getById(config.bodyB);
	if(spring){
		this.renderer.removeVisual(spring);
		this.world.removeSpring(spring);
	}
	delete this.objects[config.id];
};

SpringHandler.prototype.add = function(config){
	if(this.objects[config.id]){
		return;
	}
	this.update(config);
};
function ConstraintHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ConstraintHandler.prototype = Object.create(Handler.prototype);

ConstraintHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'hinge', // distance, lock, slider, hinge, gear
		name: 'Constraint ' + id,
		stiffness: p2.Equation.DEFAULT_STIFFNESS,
		relaxation: p2.Equation.DEFAULT_RELAXATION,
		bodyA: 0,
		bodyB: 0,
		collideConnected: false,
		maxForce: 1e9,

		// distance, slider, hinge
		localAnchorAX: 0,
		localAnchorAY: 0,
		localAnchorBX: 0,
		localAnchorBY: 0,

		// distance
		useCurrentDistance: true,
		distance: 1,

		// distance, hinge
		upperLimitEnabled: false,
		lowerLimitEnabled: false,
		upperLimit: 1,
		lowerLimit: 0,

		// gear
		ratio: 1,
		useCurrentRelAngle: true,
		relAngle: 0,

		// slider
		localAxisAX: 0,
		localAxisAY: 1,
		disableRotationalLock: false,

		// Slider, hinge
		motorEnabled: false,
		motorSpeed: 1,
	};
};

ConstraintHandler.prototype.update = function(config){
	var bodyA = this.sceneHandler.bodyHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.bodyHandler.getById(config.bodyB);

	var constraint = this.getById(config.id);
	if(constraint){
		this.world.removeConstraint(constraint);
	}

	if(!(bodyA && bodyB)){
		return;
	}

	var opts;
	switch(config.type){

	case 'distance':
		opts = {
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY],
			maxForce: config.maxForce
		};
		if(!config.useCurrentDistance){
			opts.distance = config.distance;
		}
		constraint = new p2.DistanceConstraint(bodyA,bodyB,opts);

		constraint.upperLimitEnabled = config.upperLimitEnabled;
		constraint.lowerLimitEnabled = config.lowerLimitEnabled;
		constraint.upperLimit = config.upperLimit;
		constraint.lowerLimit = config.lowerLimit;

		break;

	case 'lock':
		constraint = new p2.LockConstraint(bodyA,bodyB,{
			maxForce: config.maxForce
		});
		break;

	case 'slider':
		opts = {
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY],
			localAxisA: [config.localAxisAX, config.localAxisAY],
			disableRotationalLock: config.disableRotationalLock,
			maxForce: config.maxForce
		};
		constraint = new p2.PrismaticConstraint(bodyA,bodyB,opts);

		if(config.motorEnabled){
			constraint.enableMotor();
			constraint.motorSpeed = config.motorSpeed;
		}

		break;

	case 'hinge':
		// Use the local anchor for A, compute local anchor B

		var localPivotB = p2.vec2.create();
		var localPivotA = [config.localAnchorAX, config.localAnchorAY];
        p2.vec2.rotate(localPivotB, localPivotA, bodyA.angle); // To world
        p2.vec2.add(localPivotB, localPivotB, bodyA.position); // Relative to body B
        p2.vec2.subtract(localPivotB, localPivotB, bodyB.position); // Relative to body B
        p2.vec2.rotate(localPivotB, localPivotB, -bodyB.angle); // To local rotation of B

		opts = {
			localPivotA: localPivotA,
			localPivotB: localPivotB,
			maxForce: config.maxForce
		};
		constraint = new p2.RevoluteConstraint(bodyA,bodyB,opts);

		constraint.upperLimitEnabled = config.upperLimitEnabled;
		constraint.lowerLimitEnabled = config.lowerLimitEnabled;
		constraint.upperLimit = config.upperLimit;
		constraint.lowerLimit = config.lowerLimit;

		if(config.motorEnabled){
			constraint.enableMotor();
			constraint.setMotorSpeed(config.motorSpeed);
		}

		break;

	case 'gear':
		opts = {
			ratio: config.ratio,
			maxTorque: config.maxForce
		};
		if(!config.useCurrentRelAngle){
			opts.angle = config.relAngle;
		}
		constraint = new p2.GearConstraint(bodyA,bodyB,opts);
		break;

	}

	constraint.setStiffness(config.stiffness);
	constraint.setRelaxation(config.relaxation);
	constraint.collideConnected = config.collideConnected;

	this.objects[config.id] = constraint;
	this.world.addConstraint(constraint);
};

ConstraintHandler.prototype.remove = function(config){
	var constraint = this.getById(config.id);
	if(constraint){
		this.world.removeConstraint(constraint);
		delete this.objects[config.id];
	}
};

ConstraintHandler.prototype.add = function(config){
	if(this.objects[config.id]){ // Already added
		return;
	}
	this.update(config);
};
function MachineHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;

	var that = this;

	// Update all machines before stepping
	world.on('postStep', function(){
		var ids = Object.keys(that.objects);
		for (var i = 0; i < ids.length; i++) {
			var machine = that.objects[ids[i]];
			machine.update();
		}
	});
}
MachineHandler.prototype = Object.create(Handler.prototype);

MachineHandler.prototype.create = function(){
	var id = this.createId();
	var config = {
		id: id,
		name: 'State machine ' + id,
		states: [],
		log: false
	};
	return config;
};

MachineHandler.prototype.duplicate = function(config){
	var machineConfig = Handler.prototype.duplicate.call(this, config);
	machineConfig.states = machineConfig.states.map(function (stateConfig){
		return this.sceneHandler.stateHandler.duplicate(stateConfig);
	});
	return machineConfig;
};

MachineHandler.prototype.add = function(config, bodyConfig){
	if(this.getById(config.id)){
		return; // already added
	}
	var body = this.sceneHandler.bodyHandler.getById(bodyConfig.id);
	this.objects[config.id] = new Machine(this.world, body, {});

	this.update(config);
};

MachineHandler.prototype.remove = function(config){
	delete this.objects[config.id];
};

MachineHandler.prototype.update = function(config, bodyConfig){
	var machine = this.getById(config.id);

	if(!machine){
		var body = this.sceneHandler.bodyHandler.getById(bodyConfig.id);
		machine = this.objects[config.id] = new Machine(this.world, body, {});
	}

	machine.logging = config.log;
};

MachineHandler.prototype.stopAllMachines = function(){
	var ids = Object.keys(this.objects);
	for (var i = 0; i < ids.length; i++) {
		var machine = this.objects[ids[i]];
		machine.stop();
	}
};
function MaterialHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
MaterialHandler.prototype = Object.create(Handler.prototype);

MaterialHandler.prototype.create = function(name){
	var id = this.createId();
	var config = {
		id: id,
		name: name || 'Material ' + id
	};
	return config;
};

MaterialHandler.prototype.add = function(config){
	if(this.getById(config.id)){
		return; // already added
	}
	var m = this.objects[config.id] = new p2.Material();
	this.update(config);
	return m;
};

MaterialHandler.prototype.remove = function(config){
	delete this.objects[config.id];
};

MaterialHandler.prototype.update = function(config){
	var material = this.getById(config.id);

	if(!material){
		material = this.objects[config.id] = new p2.Material();
	}
};

function ContactMaterialHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ContactMaterialHandler.prototype = Object.create(Handler.prototype);

ContactMaterialHandler.prototype.create = function(name){
	var id = this.createId();
	var config = {
		id: id,
		name: name || 'ContactMaterial ' + id,
		materialA: 0,
		materialB: 0,
		friction: 0.3,
		restitution: 0,
		stiffness: p2.Equation.DEFAULT_STIFFNESS,
		relaxation: p2.Equation.DEFAULT_RELAXATION,
		frictionStiffness: p2.Equation.DEFAULT_STIFFNESS,
		frictionRelaxation: p2.Equation.DEFAULT_RELAXATION,
		surfaceVelocity: 0
	};
	return config;
};

ContactMaterialHandler.prototype.createIceIce = function(iceMaterialConfig){
	var config = this.create('Ice / ice');
	config.friction = 0;
	config.materialA = config.materialB = iceMaterialConfig.id;
	return config;
};

ContactMaterialHandler.prototype.createWoodWood = function(woodMaterialConfig){
	var config = this.create('Wood / wood');
	config.friction = 0.3;
	config.materialA = config.materialB = woodMaterialConfig.id;
	return config;
};

ContactMaterialHandler.prototype.createIceWood = function(iceMaterialConfig, woodMaterialConfig){
	var config = this.create('Ice / wood');
	config.friction = 0.1;
	config.materialA = iceMaterialConfig.id;
	config.materialB = woodMaterialConfig.id;
	return config;
};

ContactMaterialHandler.prototype.add = function(config){
	if(this.getById(config.id)){
		return; // already added
	}
	var materialA = this.sceneHandler.materialHandler.getById(config.materialA);
	var materialB = this.sceneHandler.materialHandler.getById(config.materialB);

	if(materialA && materialB){
		var cm = this.objects[config.id] = new p2.ContactMaterial(materialA, materialB, {});
		this.world.addContactMaterial(cm);
	}

	this.update(config);
};

ContactMaterialHandler.prototype.remove = function(config){
	var cm = this.getById(config.id);
	if (cm) {
		this.world.removeContactMaterial(cm);
	}

	delete this.objects[config.id];
};

ContactMaterialHandler.prototype.update = function(config){
	var cm = this.getById(config.id);

	var materialA = this.sceneHandler.materialHandler.getById(config.materialA);
	var materialB = this.sceneHandler.materialHandler.getById(config.materialB);

	if(!cm && materialA && materialB){
		cm = this.objects[config.id] = new p2.ContactMaterial(materialA, materialB);
		this.world.addContactMaterial(cm);
	}

	if(cm){
		cm.materialA = materialA;
		cm.materialB = materialB;
		cm.friction = config.friction;
		cm.restitution = config.restitution;
		cm.stiffness = config.stiffness;
		cm.relaxation = config.relaxation;
		cm.frictionStiffness = config.frictionStiffness;
		cm.frictionRelaxation = config.frictionRelaxation;
		cm.surfaceVelocity = config.surfaceVelocity;
	}
};

function BodyHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.world = world;
	this.renderer = renderer;
	this.sceneHandler = sceneHandler;
}
BodyHandler.prototype = Object.create(Handler.prototype);

BodyHandler.prototype.create = function(){
	var id = this.createId();
	var bodyConfig = {
		id: id,
		name: 'Body ' + id,

		material: 0,

		x: 0,
		y: 0,
		angle: 0,
		type: 'dynamic',
		mass: 1,
		collisionResponse: true,
		shapes: [],

		velocityX: 0,
		velocityY: 0,
		angularVelocity: 0,

		damping: 0,
		angularDamping: 0,

		fixedRotation: false,

		collisionMask: 1,
		collisionGroup: 1,

		enableSleep: false,

		gravityScale: 1,
		machines: []
	};

	return bodyConfig;
};

BodyHandler.prototype.duplicate = function(config){
	var bodyConfig = this.create();
	var id = bodyConfig.id;
	for(var key in bodyConfig){
		bodyConfig[key] = config[key];
	}
	bodyConfig.id = id;
	bodyConfig.shapes = bodyConfig.shapes.map(function (shapeConfig){
		return this.sceneHandler.shapeHandler.duplicate(shapeConfig);
	});
	bodyConfig.machines = bodyConfig.machines.map(function (machineConfig){
		return this.sceneHandler.machineHandler.duplicate(machineConfig);
	});
	return bodyConfig;
};

BodyHandler.prototype.update = function(config){
	var body = this.objects[config.id];
	if(!body){
		this.add(config);
		body = this.objects[config.id];
	}

	body.mass = config.mass;
	body.position.set([config.x, config.y]);
	body.angle = config.angle;

	body.velocity.set([config.velocityX, config.velocityY]);
	body.angularVelocity = config.angularVelocity;
	body.damping = config.damping;
	body.angularDamping = config.angularDamping;
	body.collisionResponse = config.collisionResponse;
	body.fixedRotation = config.fixedRotation;
	body.enableSleep = config.enableSleep;
	body.gravityScale = config.gravityScale;

	body.resetConstraintVelocity();

	body.type = {
		dynamic: p2.Body.DYNAMIC,
		kinematic: p2.Body.KINEMATIC,
		'static': p2.Body.STATIC
	}[config.type];

	if(config.type === 'static'){
		body.velocity.set([0, 0]);
		body.angularVelocity = 0;
		body.mass = 0;
	}

	body.updateAABB();
	body.updateMassProperties();
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

BodyHandler.prototype.add = function(config){
	if(this.objects[config.id]){
		return;
	}

	// TODO: more properties sync
	var body = new p2.Body({
		mass: config.mass
	});
	this.objects[config.id] = body;
	this.world.addBody(body);
};

BodyHandler.prototype.remove = function(config){
	var body = this.objects[config.id];
	if(body)
		this.world.removeBody(body);
	//this.renderer.removeVisual(body);
	delete this.objects[config.id];
};

function ActionHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ActionHandler.prototype = Object.create(Handler.prototype);

ActionHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'wait', // wait, setPosition

		// Wait
		time: 1,
		toState: 0,

		// setPosition
		positionX: 0,
		positionY: 0,
		angle: 0,

		// setVelocity
		velocityX: 0,
		velocityY: 0,
		angularVelocity: 0,

		// addForce
		forceX: 0,
		forceY: 0,
		angularForce: 0,

		// addForce, setVelocity
		localFrame: false,

		// key
		keyCode: -1,
		eventType: 'keydown'
	};
};

ActionHandler.prototype.add = function(config, stateConfig){
	if(this.getById(config.id)){
		return;
	}

	var state = this.sceneHandler.stateHandler.getById(stateConfig.id);
	var action = new Action();
	action.state = state;
	state.actions.push(action);
	this.objects[config.id] = action;
	this.update(config);
};

ActionHandler.prototype.remove = function(config){
	var action = this.getById(config.id);
	var idx = action.state.actions.indexOf(action);
	if(idx !== -1){
		action.state.actions.splice(idx, 1);
	}
	delete this.objects[config.id];
};

ActionHandler.prototype.update = function(config, stateConfig){
	var oldAction = this.getById(config.id);
	var action, state;

	if(oldAction){
		state = oldAction.state;
	} else {
		state = this.sceneHandler.stateHandler.getById(stateConfig.id);
	}

	switch(config.type){

	case "wait":
		var toState = this.sceneHandler.stateHandler.getById(config.toState);
		action = new WaitAction({
			time: config.time
		});
		if(toState){
			action.toState = toState;
		}
		break;

	case "setPosition":
		action = new SetPositionAction({
			position: [config.positionX, config.positionY],
			angle: config.angle
		});
		break;

	case "setVelocity":
		action = new SetVelocityAction({
			velocity: [config.velocityX, config.velocityY],
			angularVelocity: config.angularVelocity,
			localFrame: config.localFrame
		});
		break;

	case "addForce":
		action = new AddForceAction({
			force: [config.forceX, config.forceY],
			angularForce: config.angularForce,
			localFrame: config.localFrame
		});
		break;

	case "key":
		action = new KeyAction({
			keyCode: config.keyCode,
			eventType: config.eventType
		});
		var toState = this.sceneHandler.stateHandler.getById(config.toState);
		if(toState){
			action.toState = toState;
		}
		break;

	default:
		throw new Error('Action type not recognized: ' + config.type);
	}

	this.objects[config.id] = action;
	action.state = state;

	var idx = state.actions.indexOf(oldAction);
	if(idx !== -1){
		state.actions[idx] = action;
	} else {
		state.actions.push(action);
	}
};
function StateHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
StateHandler.prototype = Object.create(Handler.prototype);

StateHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		name: 'State ' + id,
		actions: []
	};
};

StateHandler.prototype.add = function(config, machineConfig){
	if(this.getById(config.id)) return;

	this.update(config, machineConfig);
};

StateHandler.prototype.remove = function(config){
	var state = this.getById(config.id);
	var idx = state.machine.states.indexOf(state);
	if(idx !== -1){
		state.machine.states.splice(idx, 1);
	}
	delete this.objects[config.id];
};

StateHandler.prototype.update = function(config, machineConfig){
	var state = this.getById(config.id);
	if(!state){
		var machine = this.sceneHandler.machineHandler.getById(machineConfig.id);
		state = new State(machine);
		machine.states.push(state);
		this.objects[config.id] = state;
	}
	// ??
};

StateHandler.prototype.duplicate = function(config){
	var stateConfig = Handler.prototype.duplicate.call(this, config);
	stateConfig.actions = stateConfig.actions.map(function (actionConfig){
		return this.sceneHandler.actionHandler.duplicate(actionConfig);
	});
	return stateConfig;
};
function SceneHandler(world,renderer){
	this.world = world;
	this.renderer = renderer;

	this.rendererHandler = new RendererHandler(renderer);
	this.solverHandler = new SolverHandler(world);
	this.bodyHandler = new BodyHandler(this, world, renderer);
	this.shapeHandler = new ShapeHandler(this, world, renderer);
	this.springHandler = new SpringHandler(this, world, renderer);
	this.worldHandler = new WorldHandler(this, world, renderer);
	this.machineHandler = new MachineHandler(this, world, renderer);
	this.stateHandler = new StateHandler(this, world, renderer);
	this.actionHandler = new ActionHandler(this, world, renderer);
	this.constraintHandler = new ConstraintHandler(this, world, renderer);
	this.materialHandler = new MaterialHandler(this, world, renderer);
	this.contactMaterialHandler = new ContactMaterialHandler(this, world, renderer);
}

SceneHandler.prototype.getById = function(id){
	return this.bodyHandler.getById(id) || this.shapeHandler.getById(id) || this.springHandler.getById(id) || this.machineHandler.getById(id) || this.stateHandler.getById(id);
};

SceneHandler.prototype.getIdOf = function(object){
	var id;

	id = this.bodyHandler.getIdOf(object);
	if(id !== -1){
		return id;
	}

	id = this.shapeHandler.getIdOf(object);
	if(id !== -1){
		return id;
	}

	id = this.springHandler.getIdOf(object);
	if(id !== -1){
		return id;
	}

	id = this.machineHandler.getIdOf(object);
	if(id !== -1){
		return id;
	}

	id = this.stateHandler.getIdOf(object);
	return id;
};

SceneHandler.prototype.findMaxId = function(config){
	var f = function (a,b){
		return a.id > b.id ? a : b;
	};
	var maxId = 1;
	var a = config.bodies
		.concat(config.springs)
		.concat(config.constraints);
	if(a.length){
		var result = a.reduce(f);
		if(result) maxId = Math.max(result.id, maxId);
	}

	for (var i = 0; i < config.bodies.length; i++) {
		var bodyConfig = config.bodies[i];
		if(bodyConfig.shapes.length){
			var result = bodyConfig.shapes.reduce(f);
			if(result) maxId = Math.max(result.id, maxId);
		}
	}
	return maxId;
};

SceneHandler.prototype.updateAll = function(config){
	// Materials
	for (i = 0; i < config.materials.length; i++) {
		this.materialHandler.update(config.materials[i]);
	}

	// ContactMaterials
	for (i = 0; i < config.contactMaterials.length; i++) {
		this.contactMaterialHandler.update(config.contactMaterials[i]);
	}

	for (var i = 0; i < config.bodies.length; i++) {
		var bodyConfig = config.bodies[i];
		this.bodyHandler.update(bodyConfig);

		// Shapes
		for (var j = 0; j < bodyConfig.shapes.length; j++) {
			this.shapeHandler.update(bodyConfig, bodyConfig.shapes[j]);
		}

		// Machines
		for (j = 0; j < bodyConfig.machines.length; j++) {
			var machineConfig = bodyConfig.machines[j];
			this.machineHandler.update(machineConfig, bodyConfig);

			// States
			for (var k = 0; k < machineConfig.states.length; k++) {
				var state = machineConfig.states[k];
				this.stateHandler.update(state, machineConfig);
			}

			// Actions, some depend on states so we update them after all states are added
			for (var k = 0; k < machineConfig.states.length; k++) {
				var state = machineConfig.states[k];
				for (var l = 0; l < state.actions.length; l++) {
					this.actionHandler.update(state.actions[l], state);
				}
			}
		}
	}
	for (i = 0; i < config.springs.length; i++) {
		var springConfig = config.springs[i];
		this.springHandler.update(springConfig);
	}
	for (i = 0; i < config.constraints.length; i++) {
		var constraintConfig = config.constraints[i];
		this.constraintHandler.update(constraintConfig);
	}

	this.rendererHandler.update(config.renderer);
	this.solverHandler.update(config.solver);
	this.worldHandler.update(config.world);
};

SceneHandler.prototype.stopSimulation = function(){
	this.machineHandler.stopAllMachines();
};

SceneHandler.prototype.createDefaultScene = function(){
	var ice = this.materialHandler.create("Ice");
	var wood = this.materialHandler.create("Wood");
	return {
		world: {
			gravityX: 0,
			gravityY: -10,
			fps: 60,
			maxSubSteps: 3,
			sleepMode: "NO_SLEEPING"
		},
		renderer: this.rendererHandler.create(),
		solver: this.solverHandler.create(),
		bodies: [],
		springs: [],
		constraints: [],
		materials: [ice, wood],
		contactMaterials: [
			this.contactMaterialHandler.createIceIce(ice),
			this.contactMaterialHandler.createWoodWood(wood),
			this.contactMaterialHandler.createIceWood(ice, wood)
		]
	};
};
function Machine(world, parent, options){
	options = options || {};

	this.world = world;
	this.parent = parent || null;

	this.id = options.id || 0;
	this.states = options.states ? options.states.slice(0) : [];
	this.currentState = null;
	this.defaultState = options.defaultState || null;
	this.requestTransitionToState = null;
	this.logging = true;
}

Machine.prototype.log = function(message){
	if(this.logging){
		console.log('Machine ' + this.id + ': ' + message);
	}
};

Machine.prototype.update = function(){

	// Enter default state
	if(!this.currentState){
		this.currentState = this.defaultState || this.states[0];
		if(!this.currentState){
			return; // No states!
		}
		this.log('Entering default state');
		this.currentState.enter(this);
		this.transition();
	}

	var cont = true;
	while(cont){

		this.requestTransitionToState = null;

		// Update states
		if(this.currentState)
			this.currentState.update(this);

		cont = this.transition();
	}
};

Machine.prototype.transition = function(){
	var transitioned = false;

	// Perform any requested transitions
	if(this.requestTransitionToState){
		transitioned = true;
		if(this.currentState){
			this.currentState.exit(this);
		}
		this.currentState = this.requestTransitionToState;
		this.requestTransitionToState.enter(this);
	} else {
		transitioned = false;
	}

	return transitioned;
};

Machine.prototype.stop = function(){
	if(this.currentState){
		this.currentState.exit(this);
		this.currentState = null;
	}
};

function State(machine){
	this.id = ++State.id;
	this.actions = [];
	this.machine = machine;
}
State.id = 1;
State.prototype.enter = function(){
	this.machine.log('Entered state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].enter(this.machine);
	}
};
State.prototype.update = function(){
	this.machine.log('Updating state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].update(this.machine);
	}
};
State.prototype.exit = function(){
	this.machine.log('Exiting state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].exit(this.machine);
	}
};

function Action(options){
	options = options || {};
	this.state = options.state || null;
}
Action.prototype.enter = function(){};
Action.prototype.update = function(){};
Action.prototype.exit = function(){};


function KeyAction(options){
	Action.apply(this, arguments);
	options = options || {};
	this.keyCode = options.keyCode || -1;
	this.eventType = options.eventType || 'keydown';
	this.toState = options.toState || null;
	this.eventHandler = options.eventHandler || null;
	this.triggered = false;
}
KeyAction.prototype = Object.create(Action.prototype);

KeyAction.prototype.enter = function(machine){
	var that = this;

	// Add handlers
	if(['keydown', 'keyup'].indexOf(this.eventType) !== -1){
		this.eventHandler = function(evt){
			if(evt.keyCode === that.keyCode){
				that.triggered = true;
			}
		};
		document.addEventListener(this.eventType, this.eventHandler);
	}
};

KeyAction.prototype.update = function(machine){
	if(this.triggered){
		machine.requestTransitionToState = this.toState;
		this.triggered = false;
	}
};

KeyAction.prototype.exit = function(){
	if(this.eventHandler){
		document.removeEventListener(this.eventType, this.eventHandler);
	}
	this.eventHandler = null;
	this.triggered = false;
};

function SetPositionAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.position = options.position ? options.position.slice(0) : [0, 0];
	this.angle = options.angle || 0;
}
SetPositionAction.prototype = Object.create(Action.prototype);
SetPositionAction.prototype.enter = function(machine){
	machine.parent.position.set(this.position);
	machine.parent.angle = this.angle;
};
SetPositionAction.prototype.update = function(){};
SetPositionAction.prototype.exit = function(){};
function SetVelocityAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.velocity = options.velocity ? options.velocity.slice(0) : [0, 0];
	this.angularVelocity = options.angularVelocity || 0;
	this.localFrame = options.localFrame || false;
}
SetVelocityAction.prototype = Object.create(Action.prototype);
SetVelocityAction.prototype.enter = function(machine){
	machine.parent.velocity.set(this.velocity);
	machine.parent.angularVelocity = this.angularVelocity;
};
SetVelocityAction.prototype.update = function(){};
SetVelocityAction.prototype.exit = function(){};

// Transition after some time
function WaitAction(options){
	Action.apply(this, arguments);
	options = options || {};
	this.time = typeof(options.time) !== 'undefined' ? options.time : 1; // seconds
	this.toState = options.toState || null;
	this.enterTime = -1;
}
WaitAction.prototype = Object.create(Action.prototype);
WaitAction.prototype.enter = function(machine){
	this.enterTime = machine.world.time;
};
WaitAction.prototype.update = function(machine){
	if(machine.world.time >= this.enterTime + this.time && this.toState){
		machine.requestTransitionToState = this.toState;
	}
};
WaitAction.prototype.exit = function(){
	this.enterTime = -1;
};
function AddForceAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.force = options.force ? options.force.slice(0) : [0, 0];
	this.angularForce = options.angularForce || 0;
	this.localFrame = options.localFrame || false;

	this.tmpVec = p2.vec2.create();
}
AddForceAction.prototype = Object.create(Action.prototype);
AddForceAction.prototype.enter = function(){};

AddForceAction.prototype.update = function(machine){
	p2.vec2.copy(this.tmpVec, this.force);
	if(this.localFrame){
		p2.vec2.rotate(this.tmpVec, this.tmpVec, machine.parent.angle);
	}

	p2.vec2.add(machine.parent.force, this.tmpVec, machine.parent.force);
	machine.parent.angularForce += this.angularForce;
};
AddForceAction.prototype.exit = function(){};
