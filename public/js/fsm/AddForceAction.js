function AddForceAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.force = options.force ? options.force.slice(0) : [0, 0];
	this.angularForce = options.angularForce || 0;
}
AddForceAction.prototype = Object.create(Action.prototype);
AddForceAction.prototype.enter = function(){};
AddForceAction.prototype.update = function(machine){
	machine.parent.force[0] += this.force[0];
	machine.parent.force[1] += this.force[1];
	machine.parent.angularForce += this.angularForce;
};
AddForceAction.prototype.exit = function(){};
