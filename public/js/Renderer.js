
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