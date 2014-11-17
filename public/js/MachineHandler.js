function MachineHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
MachineHandler.prototype = Object.create(Handler.prototype);

MachineHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		name: 'State machine ' + id,
		states: [this.sceneHandler.stateHandler.create()]
	};
};