var sceneHandler;

angular.module('physicsApp', [])

.controller('SceneCtrl', function ($scope, $rootScope) {

	var world = new p2.World();
	renderer = new WebGLRenderer(world);
	renderer.enableSelection();
	renderer.state = renderer.defaultState = Renderer.PANZOOM;
	sceneHandler = new SceneHandler(world,renderer);

	$scope.selectedId = -1;

	$scope.playing = false;
	$scope.togglePlaying = function(){
		console.log('playy')
		$scope.playing = !$scope.playing;
	};

	$scope.getSelectedId = function () {
		return $scope.selectedId;
	};

	$scope.setSelectedId = function (id) {
		var obj = sceneHandler.getById(id);
		renderer.selection.length = 0;
		if(obj){
			renderer.selection.push(obj);
		}
		$scope.selectedId = id;
	};

	// Selection made from within the renderer. Update the app state
	renderer.on('click', function (event){
		var targets = event.targets.filter(function (target){
			return target instanceof p2.Body;
		});
		var clickedItem = targets[0];

		renderer.selection.length = 0;
		if(clickedItem){
			var id = sceneHandler.getIdOf(clickedItem);
			renderer.selection[0] = clickedItem;
			$scope.selectedId = id || -1;
		} else {
			$scope.selectedId = -1;
		}

		$scope.$digest();
	});

	renderer.on('dblclick', function (event){
		var targets = event.targets.filter(function (target){
			return target instanceof p2.Shape;
		});
		var clickedItem = targets[0];

		renderer.selection.length = 0;
		if(clickedItem){
			var id = sceneHandler.getIdOf(clickedItem);
			$scope.selectedId = id || -1;
			renderer.selection[0] = clickedItem;
		} else {
			$scope.selectedId = -1;
		}

		$scope.$digest();
	});

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
		$scope.setSelectedId(bodyConfig.id);
	};

	$scope.removeBody = function (body) {
		var idx = $scope.bodies.indexOf(body);
		if(idx !== -1){
			$scope.bodies.splice(idx, 1);

			// Remove shapes
			var shapes = body.shapes;
			while(shapes.length){
				$scope.removeShape(body, shapes[0]);
			}

			// Machines
			var machines = body.machines;
			while(machines.length){
				$scope.removeMachine(body, machines[0]);
			}

		}
		sceneHandler.bodyHandler.remove(body);
		$scope.setSelectedId(-1);
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
		for (i = 0; i < machine.states.length; i++) {
			for (var j = 0; j < machine.states[i].actions.length; j++) {
				sceneHandler.actionHandler.update(machine.states[i].actions[j]);
			}
		}
	};


	$scope.getBodyConfigById = function (id){
		for (var i = 0; i < $scope.bodies.length; i++) {
			var bodyConfig = $scope.bodies[i];
			if(bodyConfig.id === id){
				return bodyConfig;
			}
		}
		return null;
	};

	$scope.getShapeConfigById = function (id){
		for (var i = 0; i < $scope.bodies.length; i++) {
			var bodyConfig = $scope.bodies[i];

			for (var j = 0; j < bodyConfig.shapes.length; j++) {
				var shapeConfig = bodyConfig.shapes[j];

				if(shapeConfig.id === id){
					return shapeConfig;
				}
			}
		}
		return null;
	};

	$scope.getBodyFromShape = function (shape){
        for(var k=0; k<world.bodies.length; k++){
            var body = world.bodies[k];
            for(var j=0; j<body.shapes.length; j++){
                var currentShape = body.shapes[j];
                if(currentShape === shape){
                    return body;
                }
            }
        }
    };

	$scope.removeShape = function(body, shape){
		var idx = body.shapes.indexOf(shape);
		if(idx !== -1)
			body.shapes.splice(idx, 1);
		sceneHandler.shapeHandler.remove(body.id, shape);
		$scope.setSelectedId(body.id);
		renderer.selection.length = 0;
	};

	$scope.removeAction = function (state, action) {
		var idx = state.actions.indexOf(action);
		if(idx !== -1){
			state.actions.splice(idx, 1);
		}
		sceneHandler.actionHandler.remove(action);
		$scope.setSelectedId(-1);
	};

	$scope.removeMachine = function (body, machine) {

		// Remove states
		while(machine.states.length){
			$scope.removeState(machine, machine.states[0]);
		}

		// Remove the machine
		var idx = body.machines.indexOf(machine);
		if(idx !== -1){
			body.machines.splice(idx, 1);
		}
		sceneHandler.machineHandler.remove(machine);
		$scope.setSelectedId(-1);
	};

	$scope.addSpring = function () {
		var config = sceneHandler.springHandler.create();
		$scope.springs.push(config);
		sceneHandler.springHandler.add(config);
		$scope.setSelectedId(config.id);
	};

	$scope.removeSpring = function (config) {
		var idx = $scope.springs.indexOf(config);
		if(idx !== -1)
			$scope.springs.splice(idx, 1);
		sceneHandler.springHandler.remove(config);
		$scope.setSelectedId(-1);
	};

	$scope.addConstraint = function () {
		var config = sceneHandler.constraintHandler.create();
		$scope.constraints.push(config);
		sceneHandler.constraintHandler.add(config);
		$scope.setSelectedId(config.id);
	};

	$scope.removeConstraint = function (config) {
		var idx = $scope.constraints.indexOf(config);
		if(idx !== -1)
			$scope.constraints.splice(idx, 1);
		sceneHandler.constraintHandler.remove(config);
		$scope.setSelectedId(-1);
	};


	$scope.addMaterial = function () {
		var config = sceneHandler.materialHandler.create();
		$scope.materials.push(config);
		sceneHandler.materialHandler.add(config);
		$scope.setSelectedId(config.id);
	};

	$scope.removeMaterial = function (config) {
		var idx = $scope.materials.indexOf(config);
		if(idx !== -1)
			$scope.materials.splice(idx, 1);
		sceneHandler.materialHandler.remove(config);
		$scope.setSelectedId(-1);
	};


	$scope.addContactMaterial = function () {
		var config = sceneHandler.contactMaterialHandler.create();
		$scope.contactMaterials.push(config);
		sceneHandler.contactMaterialHandler.add(config);
		$scope.setSelectedId(config.id);
	};

	$scope.removeContactMaterial = function (config) {
		var idx = $scope.contactMaterials.indexOf(config);
		if(idx !== -1)
			$scope.contactMaterials.splice(idx, 1);
		sceneHandler.contactMaterialHandler.remove(config);
		$scope.setSelectedId(-1);
	};



	$scope.quickAdd = function (shapeType, bodyName, shapeName) {
		var bodyConfig = sceneHandler.bodyHandler.create();
		$scope.bodies.push(bodyConfig);
		sceneHandler.bodyHandler.add(bodyConfig);

		var shapeConfig = sceneHandler.shapeHandler.create();
		bodyConfig.shapes.push(shapeConfig);
		sceneHandler.shapeHandler.add(bodyConfig, shapeConfig);

		shapeConfig.type = shapeType;
		bodyConfig.name = bodyName;
		shapeConfig.name = shapeName;

		$scope.setSelectedId(bodyConfig.id);
	};



	$scope.$watch('playing', function (nv, ov){
		renderer.paused = !nv;
		if(renderer.paused){
			renderer.resetTime = true;
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
	var Keys = {
		DELETE: 46,
		SPACE: 32
	};
	window.addEventListener('keyup', function (evt) {
		if(['CANVAS','BODY'].indexOf(document.activeElement.nodeName) === -1){
			return;
		}
		switch(evt.keyCode){

		case Keys.SPACE:
			$scope.playing = !$scope.playing;
			$scope.$digest();
			break;

		case Keys.DELETE:
			// Delete current selection
			for (var i = 0; i < renderer.selection.length; i++) {
				var obj = renderer.selection[i];
				if(obj instanceof p2.Body){
					var id = sceneHandler.bodyHandler.getIdOf(obj);
					var bodyConfig = $scope.getBodyConfigById(id);
					$scope.removeBody(bodyConfig);
				} else if(obj instanceof p2.Shape){
					var shapeId = sceneHandler.shapeHandler.getIdOf(obj);
					var body = $scope.getBodyFromShape(obj);
					var bodyId = sceneHandler.bodyHandler.getIdOf(body);
					var bodyConfig = $scope.getBodyConfigById(bodyId);
					var shapeConfig = $scope.getShapeConfigById(shapeId);
					$scope.removeShape(bodyConfig, shapeConfig);
				}
			}
			renderer.selection.length = 0;
			$scope.selectedId = -1;
			$scope.$digest();
			break;
		}
	});

	// On click save - old!
	// document.getElementById('saveButton').addEventListener('click', function (evt){
	// 	$scope.save();
	// }, true);

	$scope.save = function () {
		var vars = Object.keys($scope).filter(function(v){ return v[0] !== '$'; });
		var data = {};
		for (var i = 0; i < vars.length; i++) {
			data[vars[i]] = $scope[vars[i]];
		}
		data = {
			version: 11,
			world: JSON.parse(angular.toJson($scope.world)),
			solver: JSON.parse(angular.toJson($scope.solver)),
			renderer: JSON.parse(angular.toJson($scope.renderer)),
			bodies: JSON.parse(angular.toJson($scope.bodies)),
			springs: JSON.parse(angular.toJson($scope.springs)),
			constraints: JSON.parse(angular.toJson($scope.constraints)),
			materials: JSON.parse(angular.toJson($scope.materials)),
			contactMaterials: JSON.parse(angular.toJson($scope.contactMaterials))
		};
		window.location.hash = "";
		document.getElementById('sceneData').setAttribute('value', JSON.stringify(data));
		document.getElementById('form').submit();
	};


	/*
	setTimeout(function(){
		renderer.frameAll();
	}, 1000);
	*/
})

.controller('ShapeCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.shapeHandler.create()).map(function(v){ return 'shape.' + v; });
	vars.push(
		'body.collisionGroup',
		'body.collisionMask'
	);
	watchMany($scope, vars, function() {
		sceneHandler.shapeHandler.update($scope.body, $scope.shape);
   });
})

.controller('BodyCtrl', function ($scope, $rootScope) {

	// Convert from string to integer
	$scope.$watch('body.collisionMask', function(nv, ov){
		$scope.body.collisionMask = parseInt(nv, 10);
	});
	$scope.$watch('body.collisionGroup', function(nv, ov){
		$scope.body.collisionGroup = parseInt(nv, 10);
	});

	$scope.addShapeToBody = function (body) {
		var config = sceneHandler.shapeHandler.create();
		body.shapes.push(config);
		sceneHandler.shapeHandler.add(body, config);
		$scope.setSelectedId(config.id);
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

	renderer.on('selectionChange', function (){
		if(renderer.selection.length){
			var id = sceneHandler.bodyHandler.getIdOf(renderer.selection[renderer.selection.length - 1]);

			if(id && id !== -1){
				$scope.setSelectedId(id);
			} else {
				$scope.setSelectedId(-1);
			}
		}
	});

	var vars = Object.keys(sceneHandler.bodyHandler.create()).map(function(v){ return 'body.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.bodyHandler.update($scope.body);
	});
})

.controller('MachineCtrl', function ($scope, $rootScope) {

	$scope.addState = function (machine) {
		var config = sceneHandler.stateHandler.create();
		machine.states.push(config);
		sceneHandler.stateHandler.add(config, machine);
	};

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

	renderer.on('selectionChange', function (){
		if(renderer.selection.length){
			var id = sceneHandler.springHandler.getIdOf(renderer.selection[renderer.selection.length - 1]);
			$scope.setSelectedId(id);
		} else {
			$scope.setSelectedId(-1);
		}
	});

	var vars = Object.keys(sceneHandler.springHandler.create()).map(function(v){ return 'spring.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.springHandler.update($scope.spring);
	});

})

.controller('StateCtrl', function ($scope, $rootScope) {

	$scope.addAction = function (state) {
		var config = sceneHandler.actionHandler.create();
		state.actions.push(config);
		sceneHandler.actionHandler.add(config, state);
	};

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

	renderer.on('selectionChange', function (){
		if(renderer.selection.length){
			var id = sceneHandler.constraintHandler.getIdOf(renderer.selection[renderer.selection.length - 1]);
			$scope.setSelectedId(id);
		} else {
			$scope.setSelectedId(-1);
		}
	});

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
})

.controller('MaterialCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.materialHandler.create()).map(function(v){ return 'material.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.materialHandler.update($scope.material);
	});
})

.controller('ContactMaterialCtrl', function ($scope, $rootScope) {
	var vars = Object.keys(sceneHandler.contactMaterialHandler.create()).map(function(v){ return 'contactMaterial.' + v; });
	watchMany($scope, vars, function(){
		sceneHandler.contactMaterialHandler.update($scope.contactMaterial);
	});
});

// Until there's watchGroup
function watchMany(scope, vars, listener){
	for (var i = 0; i < vars.length; i++) {
		scope.$watch(vars[i], listener);
	}
}