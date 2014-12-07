function Machine(world, parent, options){
	options = options || {};

	this.world = world;
	this.parent = parent || null;

	this.id = options.id || 0;
	this.states = options.states ? options.states.slice(0) : [];
	this.currentState = null;
	this.defaultState = options.defaultState || null;
	this.requestTransitionToState = null;
	this.logging = true;
}

Machine.prototype.log = function(message){
	if(this.logging){
		console.log('Machine ' + this.id + ': ' + message);
	}
};

Machine.prototype.update = function(){

	// Enter default state
	if(!this.currentState){
		this.currentState = this.defaultState || this.states[0];
		if(!this.currentState){
			return; // No states!
		}
		this.log('Entering default state');
		this.currentState.enter(this);
		this.transition();
	}

	var cont = true;
	while(cont){

		this.requestTransitionToState = null;

		// Update states
		if(this.currentState)
			this.currentState.update(this);

		cont = this.transition();
	}
};

Machine.prototype.transition = function(){
	var transitioned = false;

	// Perform any requested transitions
	if(this.requestTransitionToState){
		transitioned = true;
		if(this.currentState){
			this.currentState.exit(this);
		}
		this.currentState = this.requestTransitionToState;
		this.requestTransitionToState.enter(this);
	} else {
		transitioned = false;
	}

	return transitioned;
};

Machine.prototype.stop = function(){
	if(this.currentState){
		this.currentState.exit(this);
		this.currentState = null;
	}
};

function State(machine){
	this.id = ++State.id;
	this.actions = [];
	this.machine = machine;
}
State.id = 1;
State.prototype.enter = function(){
	this.machine.log('Entered state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].enter(this.machine);
	}
};
State.prototype.update = function(){
	this.machine.log('Updating state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].update(this.machine);
	}
};
State.prototype.exit = function(){
	this.machine.log('Exiting state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].exit(this.machine);
	}
};

function Action(options){
	options = options || {};
	this.state = options.state || null;
}
Action.prototype.enter = function(){};
Action.prototype.update = function(){};
Action.prototype.exit = function(){};

