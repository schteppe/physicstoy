function ShapeHandler(sceneHandler, world, renderer){
	this.world = world;
	this.renderer = renderer;
	this.sceneHandler = sceneHandler;

	this.shapes = {};
}

ShapeHandler.prototype.getById = function(id){
	return this.shapes[id];
};

ShapeHandler.prototype.update = function(bodyId, config){
	var body = this.sceneHandler.getById(bodyId);

	var shape = this.shapes[config.id];
	if(!shape){
		this.add(bodyId, config);
		shape = this.shapes[config.id];
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
	}
	this.shapes[config.id] = body.shapes[i] = shape;
	shape.color = oldColor;

	// Hack in the color
	shape.color = parseInt(config.color.replace('#',''), 16);

	body.shapeOffsets[i].set([config.x, config.y]);
	body.shapeAngles[i] = config.angle;

	this.bodyChanged(body);
};

ShapeHandler.prototype.add = function(bodyId, config){
	// Get the parent body
	var body = this.sceneHandler.getById(bodyId);
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
	}

	this.shapes[config.id] = shape;
	body.addShape(shape, [config.x, config.y], config.angle);
	this.update(bodyId, config);
};

ShapeHandler.prototype.remove = function(bodyId, config){
	var shape = this.shapes[config.id];
	var body = this.sceneHandler.getById(bodyId);
	body.removeShape(shape);
	this.bodyChanged(body);
	delete this.shapes[config.id];
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
	var id = this.sceneHandler.createId();
	return {
		id: id,
		name: 'Circle ' + id,

		type: 'circle',
		color: '#' + Color.randomPastelHex(),
		angle: 0,
		x: 0,
		y: 0,
		collisionResponse: true,

		// Circle
		radius: 1,

		// Box
		width: 1,
		height: 1,

		// Convex
		vertices: []
	};
};