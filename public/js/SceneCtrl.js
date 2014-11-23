angular.module('physicsApp', [])

.controller('SceneCtrl', function ($scope, $rootScope) {

	var world = new p2.World();
	renderer = new WebGLRenderer(world);
	renderer.enableSelection();
	renderer.state = renderer.defaultState = Renderer.PANZOOM;
	sceneHandler = new SceneHandler(world,renderer);

	$scope.playing = false;

	var scene;
	if(window.scene){
		scene = window.scene;
	} else {
		scene = sceneHandler.createDefaultScene();
	}

	// Extend the scope with the scene data
	for(var key in scene){
		$scope[key] = scene[key];
	}

	// Make sure we get new ids
	Handler.idCounter = sceneHandler.findMaxId(scene) + 1;

	$scope.updateAll = function () {
		sceneHandler.updateAll();
	};

	$scope.addBody = function () {
		var bodyConfig = sceneHandler.bodyHandler.create();
		$scope.bodies.push(bodyConfig);
		sceneHandler.bodyHandler.add(bodyConfig);
	};

	$scope.removeBody = function (body) {
		var idx = $scope.bodies.indexOf(body);
		if(idx !== -1)
			$scope.bodies.splice(idx, 1);
		sceneHandler.bodyHandler.remove(body);
	};

	$scope.addShapeToBody = function (body) {
		var config = sceneHandler.shapeHandler.create();
		body.shapes.push(config);
		sceneHandler.shapeHandler.add(body.id, config);
	};

	$scope.removeShape = function(body, shape){
		var idx = body.shapes.indexOf(shape);
		if(idx !== -1)
			body.shapes.splice(idx, 1);
		sceneHandler.shapeHandler.remove(body.id, shape);
	};

	$scope.addMachineToBody = function (body) {
		var config = sceneHandler.machineHandler.create();
		body.machines.push(config);
		sceneHandler.machineHandler.add(config, body);

		// Create default state
		var stateConfig = sceneHandler.stateHandler.create();
		config.states.push(stateConfig);
		sceneHandler.stateHandler.add(stateConfig, config);
	};

	$scope.removeMachine = function (body, machine) {
		var idx = body.machines.indexOf(machine);
		if(idx !== -1){
			body.machines.splice(idx, 1);
		}
	};

	$scope.addState = function (machine) {
		var config = sceneHandler.stateHandler.create();
		machine.states.push(config);
		sceneHandler.stateHandler.add(config, machine);
	};

	$scope.removeState = function (machine, state) {
		var idx = machine.states.indexOf(state);
		if(idx !== -1){
			machine.states.splice(idx, 1);
		}
		// Remove all actions
		for (var i = 0; i < state.actions.length; i++) {
			sceneHandler.actionHandler.remove(state.actions[i]);
		}

		// Remove state
		sceneHandler.stateHandler.remove(state);

		// Update all actions in all states in the machine - to update any removed refs
		for (var i = 0; i < machine.states.length; i++) {
			for (var j = 0; j < machine.states[i].actions.length; j++) {
				sceneHandler.actionHandler.update(machine.states[i].actions[j]);
			}
		}
	};

	$scope.addAction = function (state) {
		var config = sceneHandler.actionHandler.create();
		state.actions.push(config);
		sceneHandler.actionHandler.add(config, state);
	};

	$scope.removeAction = function (state,action) {
		var idx = state.actions.indexOf(action);
		if(idx !== -1){
			state.actions.splice(idx, 1);
		}
		sceneHandler.actionHandler.remove(action);
	};

	$scope.addSpring = function () {
		var config = sceneHandler.springHandler.create();
		$scope.springs.push(config);
		sceneHandler.springHandler.add(config);
	};

	$scope.removeSpring = function (config) {
		var idx = $scope.springs.indexOf(config);
		if(idx !== -1)
			$scope.springs.splice(idx, 1);
		sceneHandler.springHandler.remove(config);
	};

	$scope.addConstraint = function () {
		var config = sceneHandler.constraintHandler.create();
		$scope.constraints.push(config);
		sceneHandler.constraintHandler.add(config);
	};

	$scope.removeConstraint = function (config) {
		var idx = $scope.constraints.indexOf(config);
		if(idx !== -1)
			$scope.constraints.splice(idx, 1);
		sceneHandler.constraintHandler.remove(config);
	};


	$scope.$watch('playing', function (nv, ov){
		renderer.paused = !nv;
		if(renderer.paused){
			renderer.state = renderer.defaultState = Renderer.PANZOOM;
		} else {
			renderer.state = renderer.defaultState = Renderer.DEFAULT;
		}
		if(!nv){ // stopping
			sceneHandler.stopSimulation();
		}
		sceneHandler.updateAll($scope);
	});

	var vars = Object.keys(sceneHandler.worldHandler.create()).map(function(v){ return 'world.' + v; });
	watchMany($scope, vars, function() {
		sceneHandler.worldHandler.update($scope.world);
	});

	// Keyboard shortcuts
	window.addEventListener('keyup', function (evt) {
		if(['CANVAS','BODY'].indexOf(document.activeElement.nodeName) === -1){
			return;
		}
		switch(evt.keyCode){
		case 32:
			$scope.playing = !$scope.playing;
		}
		$scope.$apply();
	});

	// On click save
	document.getElementById('saveButton').addEventListener('click', function (evt){
		var vars = Object.keys($scope).filter(function(v){ return v[0] !== '$'; });
		var data = {};
		for (var i = 0; i < vars.length; i++) {
			data[vars[i]] = $scope[vars[i]];
		}
		data = {
			version: 4,
			world: JSON.parse(angular.toJson($scope.world)),
			solver: JSON.parse(angular.toJson($scope.solver)),
			renderer: JSON.parse(angular.toJson($scope.renderer)),
			bodies: JSON.parse(angular.toJson($scope.bodies)),
			springs: JSON.parse(angular.toJson($scope.springs)),
			constraints: JSON.parse(angular.toJson($scope.constraints))
		};
		window.location.hash = "";
		document.getElementById('sceneData').setAttribute('value', JSON.stringify(data));
		document.getElementById('form').submit();
	}, true);
})

.controller('ShapeCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.shapeHandler.create()).map(function(v){ return 'shape.' + v; });
	watchMany($scope, vars, function() {
		sceneHandler.shapeHandler.update($scope.body.id, $scope.shape);
   });
})

.controller('BodyCtrl', function ($scope, $rootScope) {
	renderer.on('selectionChange', function (){
		if(renderer.selection.length){
			var id = sceneHandler.bodyHandler.getIdOf(renderer.selection[renderer.selection.length - 1]);
			if($scope.body.id === id){
				$scope.toggled = true;
			} else {
				$scope.toggled = false;
			}
			$scope.$apply();
			setTimeout(function(){
				window.location.hash = "#id-" + id;
			}, 10);
		}
	});
	var vars = Object.keys(sceneHandler.bodyHandler.create()).map(function(v){ return 'body.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.bodyHandler.update($scope.body);
	});
})

.controller('MachineCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.machineHandler.create()).map(function(v){ return 'machine.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.machineHandler.update($scope.machine);
	});
})

.controller('SpringCtrl', function ($scope, $rootScope) {

	// Convert from string to integer
	$scope.$watch('spring.bodyA', function(nv, ov){
		$scope.spring.bodyA = parseInt(nv, 10);
	});
	$scope.$watch('spring.bodyB', function(nv, ov){
		$scope.spring.bodyB = parseInt(nv, 10);
	});

	var vars = Object.keys(sceneHandler.springHandler.create()).map(function(v){ return 'spring.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.springHandler.update($scope.spring);
	});

})

.controller('StateCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.stateHandler.create()).map(function(v){ return 'state.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.stateHandler.update($scope.state);
	});
})

.controller('ActionCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.actionHandler.create()).map(function(v){ return 'action.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.actionHandler.update($scope.action);
	});
})

.controller('ConstraintCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.constraintHandler.create()).map(function(v){ return 'constraint.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.constraintHandler.update($scope.constraint);
	});
})

.controller('RendererCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.rendererHandler.create()).map(function(v){ return 'renderer.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.rendererHandler.update($scope.renderer);
	});
})

.controller('SolverCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.solverHandler.create()).map(function(v){ return 'solver.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.solverHandler.update($scope.solver);
	});
});

function watchMany(scope, vars, listener){
	for (var i = 0; i < vars.length; i++) {
		scope.$watch(vars[i], listener);
	}
}