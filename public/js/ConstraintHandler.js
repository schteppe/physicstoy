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
		disableRotationalLock: false,

		// Slider, hinge
		motorEnabled: false,
		motorSpeed: 1,
	};
};

ConstraintHandler.prototype.update = function(config){
	var bodyA = this.sceneHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.getById(config.bodyB);

	var constraint = this.getById(config.id);
	if(constraint){
		this.world.removeConstraint(constraint);
	}

	if(!(bodyA && bodyB)){
		return;
	}

	var opts;
	switch(config.type){

	case 'distance':
		opts = {
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY]
		};
		if(!config.useCurrentDistance){
			opts.distance = config.distance;
		}
		constraint = new p2.DistanceConstraint(bodyA,bodyB,opts);
		break;

	case 'lock':
		constraint = new p2.LockConstraint(bodyA,bodyB);
		break;

	case 'slider':
		opts = {
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY],
			localAxisA: [config.localAxisAX, config.localAxisAY],
			disableRotationalLock: config.disableRotationalLock
		};
		constraint = new p2.PrismaticConstraint(bodyA,bodyB,opts);
		break;

	case 'hinge':
		// Use the local anchor for A, compute local anchor B

		var localPivotB = p2.vec2.create();
		var localPivotA = [config.localAnchorAX, config.localAnchorAY];
        p2.vec2.rotate(localPivotB, localPivotA, bodyA.angle); // To world
        p2.vec2.add(localPivotB, localPivotB, bodyA.position); // Relative to body B
        p2.vec2.subtract(localPivotB, localPivotB, bodyB.position); // Relative to body B
        p2.vec2.rotate(localPivotB, localPivotB, -bodyB.angle); // To local rotation of B

		opts = {
			localPivotA: localPivotA,
			localPivotB: localPivotB
		};
		constraint = new p2.RevoluteConstraint(bodyA,bodyB,opts);
		break;

	case 'gear':
		opts = {
			ratio: config.ratio
		};
		constraint = new p2.GearConstraint(bodyA,bodyB,opts);
		break;

	}

	this.objects[config.id] = constraint;
	this.world.addConstraint(constraint);
};

ConstraintHandler.prototype.remove = function(config){
	var constraint = this.getById(config.id);
	if(constraint){
		this.world.removeConstraint(constraint);
		delete this.objects[config.id];
	}
};

ConstraintHandler.prototype.add = function(config){
	if(this.objects[config.id]){ // Already added
		return;
	}
	this.update(config);
};