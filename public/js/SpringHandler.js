function SpringHandler(sceneHandler, world, renderer){
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;

	// Maps id to object
	this.springs = {};
}

SpringHandler.prototype.create = function(){
	var id = this.sceneHandler.createId();
	return {
		id: id,
		type: 'linear',
		name: 'Spring ' + id,
		stiffness: 100,
		damping: 1,
		bodyA: 0,
		bodyB: 0,
		useInitialRestLength: true,
		restLength: 0,

		// Linear
		localAnchorAX: 0,
		localAnchorAY: 0,
		localAnchorBX: 0,
		localAnchorBY: 0
	};
};

SpringHandler.prototype.update = function(config){
	var bodyA = this.sceneHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.getById(config.bodyB);

	var spring = this.springs[config.id];
	if(spring){
		this.renderer.removeVisual(spring);
		this.world.removeSpring(spring);
	}

	if(!bodyA || !bodyB) return;

	switch(config.type){
	case 'linear':
		var opts = {
			stiffness: config.stiffness,
			damping: config.damping,
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY]
		};
		if(!config.useInitialRestLength){
			opts.restLength = config.restLength;
		}
		spring = new p2.LinearSpring(bodyA, bodyB, opts);
		break;
	case 'rotational':
		var opts = {
			stiffness: config.stiffness,
			damping: config.damping
		};
		if(!config.useInitialRestLength){
			opts.restAngle = config.restLength;
		}
		spring = new p2.RotationalSpring(bodyA, bodyB, opts);
		break;
	}
	this.world.addSpring(spring);
	this.springs[config.id] = spring;
	this.renderer.addVisual(spring);
};

SpringHandler.prototype.remove = function(config){
	var spring = this.springs[config.id];
	var bodyA = this.sceneHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.getById(config.bodyB);
	if(spring){
		this.renderer.removeVisual(spring);
		this.world.removeSpring(spring);
	}
	delete this.springs[config.id];
};

SpringHandler.prototype.add = function(config){
	if(this.springs[config.id]){
		return;
	}
	this.update(config);
};