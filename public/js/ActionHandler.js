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
		angle: 0
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

ActionHandler.prototype.update = function(config){
	var oldAction = this.getById(config.id);
	var state = oldAction.state;
	var action;

	switch(config.type){

	case "wait":
		var toState = this.sceneHandler.getById(config.toState);
		action = new WaitAction({
			time: config.time || 1
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
	}

	this.objects[config.id] = action;
	action.state = state;

	var idx = state.actions.indexOf(oldAction);
	if(idx !== -1){
		state.actions[idx] = action;
	}
};