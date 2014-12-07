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