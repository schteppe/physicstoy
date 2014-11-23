function MaterialHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
MaterialHandler.prototype = Object.create(Handler.prototype);

MaterialHandler.prototype.create = function(){
	var id = this.createId();
	var config = {
		id: id,
		name: 'Material ' + id
	};
	return config;
};

MaterialHandler.prototype.add = function(config){
	if(this.getById(config.id)){
		return; // already added
	}
	var m = this.objects[config.id] = new p2.Material();
	this.update(config);
	return m;
};

MaterialHandler.prototype.remove = function(config){
	delete this.objects[config.id];
};

MaterialHandler.prototype.update = function(config){
	var material = this.getById(config.id);

	if(!material){
		material = this.objects[config.id] = new p2.Material();
	}
};
