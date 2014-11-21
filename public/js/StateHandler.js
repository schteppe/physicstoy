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

	var machine = this.sceneHandler.getById(machineConfig.id);
	var state = new State(machine);
	machine.states.push(state);
};

StateHandler.prototype.remove = function(config){
	var state = this.getById(config.id);
	var idx = state.machine.states.indexOf(state);
	if(idx !== -1){
		state.machine.states.splice(idx, 1);
	}
};

StateHandler.prototype.update = function(config){
	// ?
};