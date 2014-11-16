function BodyHandler(world, renderer){
	this.world = world;
	this.renderer = renderer;
	this.bodies = {};
}

BodyHandler.prototype.getById = function(id){
	return this.bodies[id];
};

BodyHandler.prototype.update = function(config){
	var body = this.bodies[config.id];
	if(!body){
		this.add(config);
		body = this.bodies[config.id];
	}

	body.mass = config.mass;
	body.position.set([config.x, config.y]);
	body.angle = config.angle;

	body.velocity.set([config.velocityX, config.velocityY]);
	body.angularVelocity = config.angularVelocity;
	body.damping = config.damping;
	body.angularDamping = config.angularDamping;
	body.collisionResponse = config.collisionResponse;
	body.fixedRotation = config.fixedRotation;
	body.enableSleep = config.enableSleep;
	body.gravityScale = config.gravityScale;

	body.resetConstraintVelocity();

	body.type = {
		dynamic: p2.Body.DYNAMIC,
		kinematic: p2.Body.KINEMATIC,
		'static': p2.Body.STATIC
	}[config.type];

	body.updateMassProperties();
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

BodyHandler.prototype.add = function(config){
	if(this.bodies[config.id]){
		return;
	}

	// TODO: more properties sync
	var body = new p2.Body({
		mass: config.mass
	});
	this.bodies[config.id] = body;
	this.world.addBody(body);
	//this.renderer.addVisual(body);
};

BodyHandler.prototype.remove = function(config){
	var body = this.bodies[config.id];
	this.world.removeBody(body);
	//this.renderer.removeVisual(body);
	delete this.bodies[config.id];
};