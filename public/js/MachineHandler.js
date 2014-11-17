function MachineHandler(sceneHandler, world, renderer){
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
	this.objects = {};
}

MachineHandler.prototype.getById = function(id){
	return this.objects[id];
};

MachineHandler.prototype.create = function(){
	var id = this.sceneHandler.createId();
	return {
		id: id,
		name: 'State machine ' + id,

		states: [this.sceneHandler.stateHandler.create()]
	};
};