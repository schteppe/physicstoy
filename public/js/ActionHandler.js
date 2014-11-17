function ActionHandler(sceneHandler, world, renderer){
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}

ActionHandler.prototype.create = function(){
	var id = this.sceneHandler.createId();
	return {
		id: id,
		type: 'wait',
		time: 1
	};
};