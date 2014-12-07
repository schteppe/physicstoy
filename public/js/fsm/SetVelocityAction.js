function SetVelocityAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.velocity = options.velocity ? options.velocity.slice(0) : [0, 0];
	this.angularVelocity = options.angularVelocity || 0;
	this.localFrame = options.localFrame || false;
}
SetVelocityAction.prototype = Object.create(Action.prototype);
SetVelocityAction.prototype.enter = function(machine){
	machine.parent.velocity.set(this.velocity);
	machine.parent.angularVelocity = this.angularVelocity;
};
SetVelocityAction.prototype.update = function(){};
SetVelocityAction.prototype.exit = function(){};