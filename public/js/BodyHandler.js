function BodyHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.world = world;
	this.renderer = renderer;
	this.sceneHandler = sceneHandler;
	this.objects = {};
}
BodyHandler.prototype = Object.create(Handler.prototype);

BodyHandler.prototype.update = function(config){
	var body = this.objects[config.id];
	if(!body){
		this.add(config);
		body = this.objects[config.id];
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

	body.updateAABB();
	body.updateMassProperties();
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

BodyHandler.prototype.add = function(config){
	if(this.objects[config.id]){
		return;
	}

	// TODO: more properties sync
	var body = new p2.Body({
		mass: config.mass
	});
	this.objects[config.id] = body;
	this.world.addBody(body);
	//this.renderer.addVisual(body);
};

BodyHandler.prototype.remove = function(config){
	var body = this.objects[config.id];
	if(body)
		this.world.removeBody(body);
	//this.renderer.removeVisual(body);
	delete this.objects[config.id];
};

BodyHandler.prototype.create = function(){
	var id = this.createId();
	var bodyConfig = {
		id: id,
		name: 'Body ' + id,

		x: 0,
		y: 0,
		angle: 0,
		type: 'dynamic',
		mass: 1,
		collisionResponse: true,
		shapes: [],

		velocityX: 0,
		velocityY: 0,
		angularVelocity: 0,

		damping: 0,
		angularDamping: 0,

		fixedRotation: false,

		enableSleep: false,

		gravityScale: 1,
		machines: []
	};

	return bodyConfig;
};
