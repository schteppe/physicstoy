function TweenMoveAction(options){
	Action.apply(this, arguments);
	options = options || {};

	this.position = options.position ? options.position.slice(0) : [0, 0];
	this.angle = options.angle || 0;
}
TweenMoveAction.prototype = Object.create(Action.prototype);
TweenMoveAction.prototype.enter = function(){};
TweenMoveAction.prototype.update = function(){};
TweenMoveAction.prototype.exit = function(){};
