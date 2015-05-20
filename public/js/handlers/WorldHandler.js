function WorldHandler(sceneHandler, world, renderer){
	Handler.call(this);
	this.sceneHandler = sceneHandler;
	this.world = world;
	this.renderer = renderer;
}
WorldHandler.prototype = Object.create(Handler.prototype);

WorldHandler.prototype.update = function(config){
	console.log(config)
	var world = this.world;
	world.gravity.set([config.gravityX, config.gravityY]);
	this.renderer.maxSubSteps = config.maxSubSteps;
	this.renderer.timeStep = 1 / config.fps;
};

WorldHandler.prototype.create = function(){
	return {
		gravityX: 0,
		gravityY: -10,
		fps: 60,
		maxSubSteps: 3,
		sleepMode: "NO_SLEEPING"
	};
};