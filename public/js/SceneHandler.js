function SceneHandler(world,renderer){
	this.world = world;
	this.renderer = renderer;

	// Maps, id to object
	this.bodies = {};
	this.shapes = {};
	this.machines = {};
	this.actions = {};
	this.springs = {};
}

SceneHandler.prototype.updateAll = function(config){
	for (var i = 0; i < config.bodies.length; i++) {
		var bodyConfig = config.bodies[i];
		this.updateBody(bodyConfig);
		for (var j = 0; j < bodyConfig.shapes.length; j++) {
			this.updateShape(bodyConfig.id, bodyConfig.shapes[j]);
		}
	}
	for (i = 0; i < config.springs.length; i++) {
		var springConfig = config.springs[i];
		this.updateSpring(springConfig);
	}
	this.updateRenderer(config.renderer);
	this.updateWorld(config.world);
};

SceneHandler.prototype.updateWorld = function(config){
	var world = this.world;
	world.gravity.set([config.gravityX, config.gravityY]);
	this.renderer.maxSubSteps = config.maxSubSteps;
	this.renderer.timeStep = 1 / config.fps;
};

SceneHandler.prototype.createRenderer = function(){
	return {
		contacts: false,
		aabbs: false,
		constraints: false
	};
};

SceneHandler.prototype.updateRenderer = function(config){
	var renderer = this.renderer;
	renderer.drawAABBs = config.aabbs;
};

SceneHandler.prototype.updateSolver = function(config){
	var world = this.world;
	world.solver.iterations = config.iterations;
	world.solver.tolerance = config.tolerance;
};

SceneHandler.prototype.updateBody = function(config){
	var body = this.bodies[config.id];
	if(!body){
		this.addBody(config);
		body = this.bodies[config.id];
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
	body.updateMassProperties();
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

SceneHandler.prototype.addBody = function(config){
	if(this.bodies[config.id]){
		return;
	}

	// TODO: more properties sync
	var body = new p2.Body({
		mass: config.mass
	});
	this.bodies[config.id] = body;
	this.world.addBody(body);
	//this.renderer.addVisual(body);
};

SceneHandler.prototype.removeBody = function(config){
	var body = this.bodies[config.id];
	this.world.removeBody(body);
	//this.renderer.removeVisual(body);
	delete this.bodies[config.id];
};

SceneHandler.prototype.updateShape = function(bodyId, config){
	var body = this.bodies[bodyId];

	var shape = this.shapes[config.id];
	if(!shape){
		this.addShape(bodyId, config);
		shape = this.shapes[config.id];
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
	}
	this.shapes[config.id] = body.shapes[i] = shape;
	shape.color = oldColor;

	// Hack in the color
	shape.color = parseInt(config.color.replace('#',''), 16);

	body.shapeOffsets[i].set([config.x, config.y]);
	body.shapeAngles[i] = config.angle;

	this.bodyChanged(body);
};

SceneHandler.prototype.addShape = function(bodyId, config){
	// Get the parent body
	var body = this.bodies[bodyId];
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
	}

	this.shapes[config.id] = shape;
	body.addShape(shape, [config.x, config.y], config.angle);
	this.updateShape(bodyId, config);
};

SceneHandler.prototype.removeShape = function(bodyId, config){
	var shape = this.shapes[config.id];
	var body = this.bodies[bodyId];
	body.removeShape(shape);
	this.bodyChanged(body);
	delete this.shapes[config.id];
};

// Call when need to rerender body and stuff
SceneHandler.prototype.bodyChanged = function(body){

	// Update body properties
	body.updateMassProperties();
	body.updateAABB();

	// Update visuals
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

var idCounter = 1;
SceneHandler.prototype.createBody = function(){
	var bodyConfig = {
		id: idCounter++,
		name: 'Body ' + (idCounter - 1),

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

		enableSleep: false,

		gravityScale: 1,
		machines: []
	};

	return bodyConfig;
};

SceneHandler.prototype.createShape = function(){
	return {
		id: idCounter++,
		name: 'Circle ' + (idCounter - 1),

		type: 'circle',
		color: '#' + Color.randomPastelHex(),
		angle: 0,
		x: 0,
		y: 0,
		collisionResponse: true,

		// Circle
		radius: 1,

		// Box
		width: 1,
		height: 1,

		// Convex
		vertices: []
	};
};

SceneHandler.prototype.createSolver = function(){
	return {
		iterations: 10,
		stiffness: 1000000,
		relaxation: 4,
		tolerance: 0.0001
	};
};

SceneHandler.prototype.createWorld = function(){
	return {
		gravityX: 0,
		gravityY: -10,
		fps: 60,
		maxSubSteps: 3,
		sleepMode: "NO_SLEEPING"
	};
};

SceneHandler.prototype.createDefaultScene = function(){
	return {
		world: {
			gravityX: 0,
			gravityY: -10,
			fps: 60,
			maxSubSteps: 3,
			sleepMode: "NO_SLEEPING"
		},
		renderer: this.createRenderer(),
		solver: {
			iterations: 10,
			stiffness: 1000000,
			relaxation: 4,
			tolerance: 0.0001
		},
		bodies: [],
		springs: []
	};
};

SceneHandler.prototype.createMachine = function(){
	return {
		id: idCounter++,
		name: 'State machine ' + (idCounter - 1),

		states: [this.createState()]
	};
};

SceneHandler.prototype.createState = function(){
	return {
		id: idCounter++,
		name: 'State ' + (idCounter - 1),
		actions: []
	};
};

SceneHandler.prototype.createAction = function(){
	return {
		id: idCounter++,
		type: 'wait',
		time: 1
	};
};

SceneHandler.prototype.createSpring = function(){
	return {
		id: idCounter++,
		type: 'linear',
		name: 'Spring ' + (idCounter - 1),
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

SceneHandler.prototype.updateSpring = function(config){
	var bodyA = this.bodies[config.bodyA];
	var bodyB = this.bodies[config.bodyB];

	var spring = this.springs[config.id];
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
	this.springs[config.id] = spring;
	this.renderer.addVisual(spring);
};

SceneHandler.prototype.removeSpring = function(config){
	var spring = this.springs[config.id];
	var bodyA = this.bodies[config.bodyA];
	var bodyB = this.bodies[config.bodyB];
	if(spring){
		this.renderer.removeVisual(spring);
		this.world.removeSpring(spring);
	}
	delete this.springs[config.id];
};

SceneHandler.prototype.addSpring = function(config){
	if(this.springs[config.id]){
		return;
	}
	this.updateSpring(config);
};

