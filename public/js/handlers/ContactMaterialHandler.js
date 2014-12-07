function ContactMaterialHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ContactMaterialHandler.prototype = Object.create(Handler.prototype);

ContactMaterialHandler.prototype.create = function(name){
	var id = this.createId();
	var config = {
		id: id,
		name: name || 'ContactMaterial ' + id,
		materialA: 0,
		materialB: 0,
		friction: 0.3,
		restitution: 0,
		stiffness: p2.Equation.DEFAULT_STIFFNESS,
		relaxation: p2.Equation.DEFAULT_RELAXATION,
		frictionStiffness: p2.Equation.DEFAULT_STIFFNESS,
		frictionRelaxation: p2.Equation.DEFAULT_RELAXATION,
		surfaceVelocity: 0
	};
	return config;
};

ContactMaterialHandler.prototype.createIceIce = function(iceMaterialConfig){
	var config = this.create('Ice / ice');
	config.friction = 0;
	config.materialA = config.materialB = iceMaterialConfig.id;
	return config;
};

ContactMaterialHandler.prototype.createWoodWood = function(woodMaterialConfig){
	var config = this.create('Wood / wood');
	config.friction = 0.3;
	config.materialA = config.materialB = woodMaterialConfig.id;
	return config;
};

ContactMaterialHandler.prototype.createIceWood = function(iceMaterialConfig, woodMaterialConfig){
	var config = this.create('Ice / wood');
	config.friction = 0.1;
	config.materialA = iceMaterialConfig.id;
	config.materialB = woodMaterialConfig.id;
	return config;
};

ContactMaterialHandler.prototype.add = function(config){
	if(this.getById(config.id)){
		return; // already added
	}
	var materialA = this.sceneHandler.materialHandler.getById(config.materialA);
	var materialB = this.sceneHandler.materialHandler.getById(config.materialB);

	if(materialA && materialB){
		var cm = this.objects[config.id] = new p2.ContactMaterial(materialA, materialB, {});
		this.world.addContactMaterial(cm);
	}

	this.update(config);
};

ContactMaterialHandler.prototype.remove = function(config){
	var cm = this.getById(config.id);
	if (cm) {
		this.world.removeContactMaterial(cm);
	}

	delete this.objects[config.id];
};

ContactMaterialHandler.prototype.update = function(config){
	var cm = this.getById(config.id);

	var materialA = this.sceneHandler.materialHandler.getById(config.materialA);
	var materialB = this.sceneHandler.materialHandler.getById(config.materialB);

	if(!cm && materialA && materialB){
		cm = this.objects[config.id] = new p2.ContactMaterial(materialA, materialB);
		this.world.addContactMaterial(cm);
	}

	if(cm){
		cm.materialA = materialA;
		cm.materialB = materialB;
		cm.friction = config.friction;
		cm.restitution = config.restitution;
		cm.stiffness = config.stiffness;
		cm.relaxation = config.relaxation;
		cm.frictionStiffness = config.frictionStiffness;
		cm.frictionRelaxation = config.frictionRelaxation;
		cm.surfaceVelocity = config.surfaceVelocity;
	}
};
