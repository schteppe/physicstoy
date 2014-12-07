function ActionHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
ActionHandler.prototype = Object.create(Handler.prototype);

ActionHandler.prototype.create = function(){
	var id = this.createId();
	return {
		id: id,
		type: 'wait', // wait, setPosition

		// Wait
		time: 1,
		toState: 0,

		// setPosition
		positionX: 0,
		positionY: 0,
		angle: 0,

		// setVelocity
		velocityX: 0,
		velocityY: 0,
		angularVelocity: 0,

		// key
		keyCode: -1,
		eventType: 'keydown'
	};
};

ActionHandler.prototype.add = function(config, stateConfig){
	if(this.getById(config.id)){
		return;
	}

	var state = this.sceneHandler.getById(stateConfig.id);
	var action = new Action();
	action.state = state;
	state.actions.push(action);
	this.objects[config.id] = action;
	this.update(config);
};

ActionHandler.prototype.remove = function(config){
	var action = this.getById(config.id);
	var idx = action.state.actions.indexOf(action);
	if(idx !== -1){
		action.state.actions.splice(idx, 1);
	}
	delete this.objects[config.id];
};

ActionHandler.prototype.update = function(config, stateConfig){
	var oldAction = this.getById(config.id);
	var action, state;

	if(oldAction){
		state = oldAction.state;
	} else {
		state = this.sceneHandler.getById(stateConfig.id);
	}

	switch(config.type){

	case "wait":
		var toState = this.sceneHandler.getById(config.toState);
		action = new WaitAction({
			time: config.time
		});
		if(toState){
			action.toState = toState;
		}
		break;

	case "setPosition":
		action = new SetPositionAction({
			position: [config.positionX, config.positionY],
			angle: config.angle
		});
		break;

	case "setVelocity":
		action = new SetVelocityAction({
			velocity: [config.velocityX, config.velocityY],
			angularVelocity: config.angularVelocity
		});
		break;

	case "key":
		action = new KeyAction({
			keyCode: config.keyCode,
			eventType: config.eventType
		});
		var toState = this.sceneHandler.getById(config.toState);
		if(toState){
			action.toState = toState;
		}
		break;

	default:
		throw new Error('Action type not recognized: ' + config.type);
	}

	this.objects[config.id] = action;
	action.state = state;

	var idx = state.actions.indexOf(oldAction);
	if(idx !== -1){
		state.actions[idx] = action;
	} else {
		state.actions.push(action);
	}
};