function AddForceAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.force = options.force ? options.force.slice(0) : [0, 0];
	this.angularForce = options.angularForce || 0;
}
AddForceAction.prototype = Object.create(Action.prototype);
AddForceAction.prototype.enter = function(machine){
	machine.parent.force.set(this.force);
	machine.parent.angularForce = this.angularForce;
};
AddForceAction.prototype.update = function(){};
AddForceAction.prototype.exit = function(){};
