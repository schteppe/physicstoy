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
}

SceneHandler.prototype.getById = function(id){
	return this.bodyHandler.getById(id) || this.shapeHandler.getById(id) || this.springHandler.getById(id) || this.machineHandler.getById(id);
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
		springs: [],
		constraints: []
	};
};