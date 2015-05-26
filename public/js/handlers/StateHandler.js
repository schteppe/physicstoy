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