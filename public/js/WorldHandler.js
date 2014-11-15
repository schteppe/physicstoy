function WorldHandler(world,renderer){
	this.world = world;
	this.renderer = renderer;

	// Maps, id to object
	this.bodies = {};
	this.shapes = {};
	this.machines = {};
	this.actions = {};
}

WorldHandler.prototype.updateAll = function(config){
	for (var i = 0; i < config.bodies.length; i++) {
		var bodyConfig = config.bodies[i];
		this.updateBody(bodyConfig);
		for (var j = 0; j < bodyConfig.shapes.length; j++) {
			this.updateShape(bodyConfig.id, bodyConfig.shapes[j]);
		}
	}
};

WorldHandler.prototype.updateWorld = function(config){
	var world = this.world;
	world.gravity.set([config.gravityX, config.gravityY]);
};


WorldHandler.prototype.updateBody = function(config){
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

WorldHandler.prototype.addBody = function(config){
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

WorldHandler.prototype.removeBody = function(config){
	var body = this.bodies[config.id];
	this.world.removeBody(body);
	//this.renderer.removeVisual(body);
	delete this.bodies[config.id];
};

WorldHandler.prototype.updateShape = function(bodyId, config){
	var body = this.bodies[bodyId];

	var shape = this.shapes[config.id];
	if(!shape){
		this.addShape(bodyId, config);
		shape = this.shapes[config.id];
	}

	var i = body.shapes.indexOf(shape);

	// Check if type changed
	if(config.type == 'circle' && !(shape instanceof p2.Circle)){
		body.shapes[i] = new p2.Circle(config.radius);
	} else if(config.type == 'box' && !(shape instanceof p2.Rectangle)){
		body.shapes[i] = new p2.Rectangle(config.width, config.height);
	} else if(config.type == 'plane' && !(shape instanceof p2.Plane)){
		body.shapes[i] = new p2.Plane();
	}
	this.shapes[config.id] = body.shapes[i];

	switch(config.type){
	case 'circle':
		shape.radius = config.radius;
		break;
	case 'box':
		shape.width = config.width;
		shape.height = config.height;
		break;
	case 'plane':
		// ?
		break;
	}

	body.shapeOffsets[i].set([config.x, config.y]);
	body.shapeAngles[i] = config.angle;

	this.bodyChanged(body);
};

WorldHandler.prototype.addShape = function(bodyId, config){
	// Get the parent body
	var body = this.bodies[bodyId];
	var shape;
	switch(config.type){
	case 'circle':
		shape = new p2.Circle(config.radius);
		break;
	case 'box':
		shape = new p2.Box(config.radius);
		break;
	case 'plane':
		shape = new p2.Plane();
		break;
	}

	this.shapes[config.id] = shape;
	body.addShape(shape, [config.x, config.y], config.angle);
	this.updateShape(bodyId, config);
};

WorldHandler.prototype.removeShape = function(bodyId, config){
	var shape = this.shapes[config.id];
	var body = this.bodies[bodyId];
	body.removeShape(shape);
	this.bodyChanged(body);
};

// Call when need to rerender body and stuff
WorldHandler.prototype.bodyChanged = function(body){

	// Update body properties
	body.updateMassProperties();
	body.updateAABB();

	// Update visuals
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

var idCounter = 1;
WorldHandler.prototype.createBody = function(){
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

WorldHandler.prototype.createShape = function(){
	return {
		id: idCounter++,
		name: 'Circle ' + (idCounter - 1),

		type: 'circle',
		color: Color.randomPastelHex(),
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

WorldHandler.prototype.createMachine = function(){
	return {
		id: idCounter++,
		name: 'State machine ' + (idCounter - 1),

		states: [this.createState()]
	};
};

WorldHandler.prototype.createState = function(){
	return {
		id: idCounter++,
		name: 'State ' + (idCounter - 1),
		actions: []
	};
};

WorldHandler.prototype.createAction = function(){
	return {
		id: idCounter++,
		type: 'wait',
		time: 1
	};
};