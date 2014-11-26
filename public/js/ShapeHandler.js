function ShapeHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.world = world;
	this.renderer = renderer;
	this.sceneHandler = sceneHandler;

	this.objects = {};
}
ShapeHandler.prototype = Object.create(Handler.prototype);

ShapeHandler.prototype.update = function(bodyConfig, config){
	var body = this.sceneHandler.getById(bodyConfig.id);

	var shape = this.objects[config.id];
	if(!shape){
		this.add(bodyConfig, config);
		shape = this.objects[config.id];
	}

	var i = body.shapes.indexOf(shape);
	var oldColor = shape.color;

	switch(config.type){
	case 'circle':
		shape = new p2.Circle(config.radius);
		break;
	case 'box':
		shape = new p2.Rectangle(config.width, config.height);
		break;
	case 'plane':
		shape = new p2.Plane();
		break;
	case 'capsule':
		shape = new p2.Capsule(config.length, config.radius);
		break;
	}
	this.objects[config.id] = body.shapes[i] = shape;
	shape.color = oldColor;

	// Hack in the color
	shape.color = parseInt(config.color.replace('#',''), 16);

	var material = this.sceneHandler.materialHandler.getById(bodyConfig.material);
	if(material){
		shape.material = material;
	}

	body.shapeOffsets[i].set([config.x, config.y]);
	body.shapeAngles[i] = config.angle;

	this.bodyChanged(body);
};

ShapeHandler.prototype.add = function(bodyConfig, config){
	// Get the parent body
	var body = this.sceneHandler.getById(bodyConfig.id);
	var shape;
	switch(config.type){
	case 'circle':
		shape = new p2.Circle(config.radius);
		break;
	case 'box':
		shape = new p2.Rectangle(config.width, config.height);
		break;
	case 'plane':
		shape = new p2.Plane();
		break;
	case 'capsule':
		shape = new p2.Capsule(config.length, config.radius);
		break;
	}

	var material = this.sceneHandler.materialHandler.getById(bodyConfig.material);
	if(material){
		shape.material = material;
	}

	this.objects[config.id] = shape;
	body.addShape(shape, [config.x, config.y], config.angle);
	this.update(bodyConfig, config);
};

ShapeHandler.prototype.remove = function(bodyId, config){
	var shape = this.objects[config.id];
	var body = this.sceneHandler.getById(bodyId);
	body.removeShape(shape);
	this.bodyChanged(body);
	delete this.objects[config.id];
};

// Call when need to rerender body and stuff
ShapeHandler.prototype.bodyChanged = function(body){

	// Update body properties
	body.updateMassProperties();
	body.updateAABB();

	// Update visuals
	this.renderer.removeVisual(body);
	this.renderer.addVisual(body);
};

ShapeHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		name: 'Shape ' + id,

		type: 'circle', // circle, box, capsule, plane
		color: '#' + Color.randomPastelHex(),
		angle: 0,
		x: 0,
		y: 0,
		collisionResponse: true,

		// Circle, Capsule
		radius: 1,

		// Capsule
		length: 1,

		// Box
		width: 1,
		height: 1,

		// Convex
		vertices: []
	};
};