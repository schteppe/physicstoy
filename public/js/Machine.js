function Machine(options){
	options = options || {};

	this.world = { time: 0 };
	this.body = options.body || null;
	this.states = options.states.slice(0) || [];
	this.currentState = null;
	this.defaultState = options.defaultState || null;
	this.requestTransitionToState = null;
}
Machine.prototype.update = function(){

	// Enter default state
	if(!this.currentState && this.defaultState){
		this.currentState = this.defaultState;
		console.log('Enter default state...');
		this.defaultState.enter(this);
		this.transition();
	}

	var cont = true;
	while(cont){

		this.requestTransitionToState = null;

		// Update states
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

function State(){
	this.id = ++State.id;
	this.actions = [];
}
State.id = 0;
State.prototype.enter = function(machine){
	console.log('Entered state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].enter(machine);
	}
};
State.prototype.update = function(){
	console.log('Updating state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].update(machine);
	}
};
State.prototype.exit = function(){
	console.log('Exiting state ' + this.id);
	for (var i = 0; i < this.actions.length; i++) {
		this.actions[i].exit(machine);
	}
};

function Action(){

}

// Simple immediate transition
function TransitionAction(options){
	options = options || {};
	this.toState = options.toState || null;
}
TransitionAction.prototype = Object.create(Action.prototype);
TransitionAction.prototype.enter = function(machine){
	console.log('Requesting transition to ' + this.toState.id);
	machine.requestTransitionToState = this.toState;
};
TransitionAction.prototype.update = function(){};
TransitionAction.prototype.exit = function(){};

// Transition after some time
function WaitAction(options){
	options = options || {};
	this.time = options.time || 1; // seconds
	this.toState = options.toState || null;
}
WaitAction.prototype = Object.create(Action.prototype);
WaitAction.prototype.enter = function(machine){
	this.enterTime = machine.world.time;
};
WaitAction.prototype.update = function(machine){
	console.log('time',machine.world.time);
	if(machine.world.time >= this.enterTime + this.time){
		console.log('WaitAction requesting transition to ' + this.toState.id);
		machine.requestTransitionToState = this.toState;
	}
};
WaitAction.prototype.exit = function(){};

/*
function SetPositionAction(){
	Action.call(this);

	this.position = [0,0];
	this.angle = 0;
}
SetPositionAction.prototype = Object.create(Action.prototype);
SetPositionAction.prototype.enter = function(machine){
	machine.body.position.set(this.position);
	machine.body.angle = this.angle;
};
SetPositionAction.prototype.update = function(){};
SetPositionAction.prototype.exit = function(){};
*/

/*
var stateA = new State();
var stateB = new State();
var stateC = new State();
var action = new TransitionAction({
	toState: stateB
});
var waitAction = new WaitAction({
	toState: stateC,
	time: 1
});
stateA.actions.push(action);
stateB.actions.push(waitAction);
var machine = new Machine({
	states: [stateA, stateB, stateC],
	defaultState: stateA
});
machine.update();
machine.update();
machine.update();
machine.update();
machine.world.time = 0.5;
machine.update();
machine.update();
machine.world.time = 1.1;
machine.update();
machine.update();
*/