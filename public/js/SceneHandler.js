function SceneHandler(world,renderer){
	this.world = world;
	this.renderer = renderer;

	// Maps, id to object
	//this.bodies = {};
	//this.shapes = {};
	this.machines = {};
	this.actions = {};
	//this.springs = {};

	this.rendererHandler = new RendererHandler(renderer);
	this.solverHandler = new SolverHandler(world);
	this.bodyHandler = new BodyHandler(this, world, renderer);
	this.shapeHandler = new ShapeHandler(this, world, renderer);
	this.springHandler = new SpringHandler(this, world, renderer);
	this.worldHandler = new WorldHandler(this, world, renderer);

	this.idCounter = 1;
}

SceneHandler.prototype.getById = function(id){
	return this.bodyHandler.getById(id) || this.shapeHandler.getById(id);
};

SceneHandler.prototype.createId = function(){
	return this.idCounter++;
};

SceneHandler.prototype.updateAll = function(config){
	for (var i = 0; i < config.bodies.length; i++) {
		var bodyConfig = config.bodies[i];
		this.bodyHandler.update(bodyConfig);
		for (var j = 0; j < bodyConfig.shapes.length; j++) {
			this.shapeHandler.update(bodyConfig.id, bodyConfig.shapes[j]);
		}
	}
	for (i = 0; i < config.springs.length; i++) {
		var springConfig = config.springs[i];
		this.springHandler.update(springConfig);
	}
	this.rendererHandler.update(config.renderer);
	this.solverHandler.update(config.solver);
	this.worldHandler.update(config.world);
};

/*
SceneHandler.prototype.updateWorld = function(config){
	var world = this.world;
	world.gravity.set([config.gravityX, config.gravityY]);
	this.renderer.maxSubSteps = config.maxSubSteps;
	this.renderer.timeStep = 1 / config.fps;
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
*/

SceneHandler.prototype.createDefaultScene = function(){
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
		springs: []
	};
};

SceneHandler.prototype.createMachine = function(){
	var id = this.createId();
	return {
		id: id,
		name: 'State machine ' + id,

		states: [this.createState()]
	};
};

SceneHandler.prototype.createState = function(){
	var id = this.createId();
	return {
		id: id,
		name: 'State ' + id,
		actions: []
	};
};

SceneHandler.prototype.createAction = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'wait',
		time: 1
	};
};
