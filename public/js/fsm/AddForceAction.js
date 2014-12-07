function AddForceAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.force = options.force ? options.force.slice(0) : [0, 0];
	this.angularForce = options.angularForce || 0;
	this.localFrame = options.localFrame || false;

	this.tmpVec = p2.vec2.create();
}
AddForceAction.prototype = Object.create(Action.prototype);
AddForceAction.prototype.enter = function(){};

AddForceAction.prototype.update = function(machine){
	p2.vec2.copy(this.tmpVec, this.force);
	if(this.localFrame){
		p2.vec2.rotate(this.tmpVec, this.tmpVec, machine.parent.angle);
	}

	p2.vec2.add(machine.parent.force, this.tmpVec, machine.parent.force);
	machine.parent.angularForce += this.angularForce;
};
AddForceAction.prototype.exit = function(){};
