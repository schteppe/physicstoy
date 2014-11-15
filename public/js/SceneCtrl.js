angular.module('physicsApp', [])

.controller('SceneCtrl', function ($scope, $rootScope) {

	var world = new p2.World();
	var renderer = new WebGLRenderer(world);
	worldHandler = new WorldHandler(world,renderer);

	$scope.gravityX = 0;
	$scope.gravityY = 0;
	$scope.fps = 60;
	$scope.maxSubSteps = 3;
	$scope.playing = false;
	$scope.sleepMode = "NO_SLEEPING";

	$scope.renderer = {
		contacts: false,
		aabbs: false,
		constraints: false
	};

	$scope.solver = {
		iterations: 10,
		stiffness: 1000000,
		relaxation: 4,
		tolerance: 0.0001
	};

	$scope.bodies = [];

	if(window.scene){
		var scene = window.scene;
		for(var key in scene){
			$scope[key] = scene[key];
		}
	}

	$scope.updateAll = function () {
		for (var i = 0; i < $scope.bodies.length; i++) {
			var bodyConfig = $scope.bodies[i];
			worldHandler.updateBody(bodyConfig);
			for (var j = 0; j < bodyConfig.shapes.length; j++) {
				worldHandler.updateShape(bodyConfig.id, bodyConfig.shapes[j]);
			}
		}
	};

	$scope.getTotalBodies = function () {
		return $scope.bodies.length;
	};

	$scope.addBody = function () {
		var bodyConfig = worldHandler.createBody();
		$scope.bodies.push(bodyConfig);
		worldHandler.addBody(bodyConfig);
	};

	$scope.removeBody = function (body) {
		var idx = $scope.bodies.indexOf(body);
		if(idx !== -1)
			$scope.bodies.splice(idx, 1);
		worldHandler.removeBody(body);
	};

	$scope.addShapeToBody = function (body) {
		var config = worldHandler.createShape();
		body.shapes.push(config);
		worldHandler.addShape(body.id, config);
	};

	$scope.removeShape = function(body, shape){
		var idx = body.shapes.indexOf(shape);
		body.shapes.splice(idx, 1);
		worldHandler.removeShape(body.id, shape);
	};

	$scope.addMachineToBody = function (body) {
		body.machines.push(worldHandler.createMachine());
	};

	$scope.removeMachine = function (body, machine) {
		var idx = body.machines.indexOf(machine);
		body.machines.splice(idx, 1);
	};

	$scope.addState = function (machine) {
		machine.states.push(worldHandler.createState());
	};

	$scope.removeState = function (machine, state) {
		var idx = machine.states.indexOf(state);
		machine.states.splice(idx, 1);
	};

	$scope.addAction = function (state) {
		state.actions.push(worldHandler.createAction());
	};

	$scope.removeAction = function (state,action) {
		var idx = state.actions.indexOf(action);
		state.actions.splice(idx, 1);
	};

	$scope.$watch('playing', function (nv, ov){
		renderer.paused = !nv;
	});

	watchMany($scope, [
		'gravityX',
		'gravityY'
	], function () {
		worldHandler.updateWorld($scope);
	});
})

.controller('ShapeCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(worldHandler.createShape()).map(function(v){ return 'shape.' + v; });
	watchMany($scope, vars, function() {
		worldHandler.updateShape($scope.body.id, $scope.shape);
   });
})

.controller('BodyCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(worldHandler.createBody()).map(function(v){ return 'body.' + v; });
	watchMany($scope, vars, function(){
		worldHandler.updateBody($scope.body);
	});
})

.controller('MachineCtrl', function ($scope, $rootScope) {
})

.controller('StateCtrl', function ($scope, $rootScope) {
})

.controller('ActionCtrl', function ($scope, $rootScope) {
});

function watchMany(scope, vars, listener){
	for (var i = 0; i < vars.length; i++) {
		scope.$watch(vars[i], listener);
	}
}