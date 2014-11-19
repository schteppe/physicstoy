function ConstraintHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ConstraintHandler.prototype = Object.create(Handler.prototype);

ConstraintHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'hinge', // distance, lock, slider, hinge, gear
		name: 'Constraint ' + id,
		stiffness: 100,
		relaxation: 4,
		bodyA: 0,
		bodyB: 0,
		collideConnected: false,
		maxForce: 1e9,

		// distance, slider, hinge
		localAnchorAX: 0,
		localAnchorAY: 0,
		localAnchorBX: 0,
		localAnchorBY: 0,

		// distance
		useCurrentDistance: true,
		distance: 1,

		// distance, hinge
		upperLimitEnabled: false,
		lowerLimitEnabled: false,
		upperLimit: 1,
		lowerLimit: 0,

		// gear
		ratio: 1,
		useCurrentRelAngle: true,
		relAngle: 0,

		// slider
		localAxisAX: 0,
		localAxisAY: 1,

		// Slider, hinge
		motorEnabled: false,
		motorSpeed: 1,
	};
};

ConstraintHandler.prototype.update = function(config){
	var bodyA = this.sceneHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.getById(config.bodyB);
};

ConstraintHandler.prototype.remove = function(config){
	var constraint = this.objects[config.id];
	delete this.objects[config.id];
};

ConstraintHandler.prototype.add = function(config){
	if(this.objects[config.id]){
		return;
	}
	this.update(config);
};