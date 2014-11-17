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