function SolverHandler(world){
	Handler.call(this);
	this.world = world;
}
SolverHandler.prototype = Object.create(Handler.prototype);

SolverHandler.prototype.create = function(){
	return {
		iterations: 10,
		stiffness: 1000000,
		relaxation: 4,
		tolerance: 0.0001
	};
};

SolverHandler.prototype.update = function(config){
	var world = this.world;
	world.solver.iterations = config.iterations;
	world.solver.tolerance = config.tolerance;
};