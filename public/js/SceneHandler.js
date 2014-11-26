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

				// Actions
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