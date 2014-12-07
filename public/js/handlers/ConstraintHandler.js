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
		stiffness: p2.Equation.DEFAULT_STIFFNESS,
		relaxation: p2.Equation.DEFAULT_RELAXATION,
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
	var bodyA = this.sceneHandler.bodyHandler.getById(config.bodyA);
	var bodyB = this.sceneHandler.bodyHandler.getById(config.bodyB);

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
			localAnchorB: [config.localAnchorBX, config.localAnchorBY],
			maxForce: config.maxForce
		};
		if(!config.useCurrentDistance){
			opts.distance = config.distance;
		}
		constraint = new p2.DistanceConstraint(bodyA,bodyB,opts);

		constraint.upperLimitEnabled = config.upperLimitEnabled;
		constraint.lowerLimitEnabled = config.lowerLimitEnabled;
		constraint.upperLimit = config.upperLimit;
		constraint.lowerLimit = config.lowerLimit;

		break;

	case 'lock':
		constraint = new p2.LockConstraint(bodyA,bodyB,{
			maxForce: config.maxForce
		});
		break;

	case 'slider':
		opts = {
			localAnchorA: [config.localAnchorAX, config.localAnchorAY],
			localAnchorB: [config.localAnchorBX, config.localAnchorBY],
			localAxisA: [config.localAxisAX, config.localAxisAY],
			disableRotationalLock: config.disableRotationalLock,
			maxForce: config.maxForce
		};
		constraint = new p2.PrismaticConstraint(bodyA,bodyB,opts);

		if(config.motorEnabled){
			constraint.enableMotor();
			constraint.motorSpeed = config.motorSpeed;
		}

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
			localPivotB: localPivotB,
			maxForce: config.maxForce
		};
		constraint = new p2.RevoluteConstraint(bodyA,bodyB,opts);

		constraint.upperLimitEnabled = config.upperLimitEnabled;
		constraint.lowerLimitEnabled = config.lowerLimitEnabled;
		constraint.upperLimit = config.upperLimit;
		constraint.lowerLimit = config.lowerLimit;

		if(config.motorEnabled){
			constraint.enableMotor();
			constraint.setMotorSpeed(config.motorSpeed);
		}

		break;

	case 'gear':
		opts = {
			ratio: config.ratio,
			maxTorque: config.maxForce
		};
		if(!config.useCurrentRelAngle){
			opts.angle = config.relAngle;
		}
		constraint = new p2.GearConstraint(bodyA,bodyB,opts);
		break;

	}

	constraint.setStiffness(config.stiffness);
	constraint.setRelaxation(config.relaxation);
	constraint.collideConnected = config.collideConnected;

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