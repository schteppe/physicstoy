function ActionHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ActionHandler.prototype = Object.create(Handler.prototype);

ActionHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'wait',
		time: 1
	};
};