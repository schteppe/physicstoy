function StateHandler(sceneHandler, world, renderer){
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}

StateHandler.prototype.create = function(){
	var id = this.sceneHandler.createId();
	return {
		id: id,
		name: 'State ' + id,
		actions: []
	};
};