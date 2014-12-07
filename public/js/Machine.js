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

// Simple immediate transition
function TransitionAction(options){
	Action.apply(this, arguments);
	options = options || {};
	this.toState = options.toState || null;
}
TransitionAction.prototype = Object.create(Action.prototype);
TransitionAction.prototype.enter = function(){
	machine.requestTransitionToState = this.toState;
};
TransitionAction.prototype.update = function(){};
TransitionAction.prototype.exit = function(){};

// Transition after some time
function WaitAction(options){
	Action.apply(this, arguments);
	options = options || {};
	this.time = typeof(options.time) !== 'undefined' ? options.time : 1; // seconds
	this.toState = options.toState || null;
	this.enterTime = -1;
}
WaitAction.prototype = Object.create(Action.prototype);
WaitAction.prototype.enter = function(machine){
	this.enterTime = machine.world.time;
};
WaitAction.prototype.update = function(machine){
	if(machine.world.time >= this.enterTime + this.time && this.toState){
		machine.requestTransitionToState = this.toState;
	}
};
WaitAction.prototype.exit = function(){
	this.enterTime = -1;
};

function SetPositionAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.position = options.position ? options.position.slice(0) : [0, 0];
	this.angle = options.angle || 0;
}
SetPositionAction.prototype = Object.create(Action.prototype);
SetPositionAction.prototype.enter = function(machine){
	machine.parent.position.set(this.position);
	machine.parent.angle = this.angle;
};
SetPositionAction.prototype.update = function(){};
SetPositionAction.prototype.exit = function(){};