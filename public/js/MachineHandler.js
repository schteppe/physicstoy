function MachineHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;

	var that = this;

	// Update all machines before stepping
	world.on('postStep', function(){
		var ids = Object.keys(that.objects);
		for (var i = 0; i < ids.length; i++) {
			var machine = that.objects[ids[i]];
			machine.update();
		}
	});
}
MachineHandler.prototype = Object.create(Handler.prototype);

MachineHandler.prototype.create = function(){
	var id = this.createId();
	var config = {
		id: id,
		name: 'State machine ' + id,
		states: [],
		log: false
	};
	return config;
};

MachineHandler.prototype.add = function(config, bodyConfig){
	if(this.getById(config.id)){
		return; // already added
	}
	var body = this.sceneHandler.getById(bodyConfig.id);

	this.objects[config.id] = new Machine(this.world, body, {});

	this.update(config);
};

MachineHandler.prototype.remove = function(config){
	delete this.objects[config.id];
};

MachineHandler.prototype.update = function(config){
	var machine = this.getById(config.id);
	machine.logging = config.log;
};

MachineHandler.prototype.stopAllMachines = function(){
	var ids = Object.keys(this.objects);
	for (var i = 0; i < ids.length; i++) {
		var machine = this.objects[ids[i]];
		machine.stop();
	}
};