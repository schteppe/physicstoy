
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