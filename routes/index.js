var scene;

exports.index = function(req, res){
	res.render('index');
};

exports.view = function(req, res){
	res.render('view', {
		scene: JSON.stringify(scene)
	});
};

exports.edit = function(req, res){
	res.render('edit', {
		scene: JSON.stringify(scene)
	});
};

scene = {
	gravityX : 0,
	gravityY : -20,
	fps : 60,
	maxSubSteps : 3,
	playing : false,
	sleepMode : "NO_SLEEPING",

	renderer : {
		contacts: false,
		aabbs: false,
		constraints: false
	},

	solver : {
		iterations: 10,
		stiffness: 1000000,
		relaxation: 4,
		tolerance: 0.0001
	},

	bodies : [{
		id: 1,
		name: 'Body 1',

		x: 0,
		y: 0,
		angle: 0,
		type: 'dynamic',
		mass: 1,
		collisionResponse: true,
		shapes: [{
			id: 2,
			name: 'Circle 2',

			type: 'circle',
			color:'#ffaaaa',
			angle: 0,
			x: 0,
			y: 0,
			collisionResponse: true,

			// Circle
			radius: 1,

			// Box
			width: 1,
			height: 1,

			// Convex
			vertices: []
		}],

		velocityX: 0,
		velocityY: 0,
		angularVelocity: 0,

		damping: 0,
		angularDamping: 0,

		fixedRotation: false,

		enableSleep: false,

		gravityScale: 1,
		machines: []
	}, {
		id: 3,
		name: 'Body 2',

		x: 0,
		y: 0,
		angle: 0,
		type: 'static',
		mass: 0,
		collisionResponse: true,
		shapes: [{
			id: 4,
			name: 'Plane 3',

			type: 'plane',
			color:'#aaffaa',
			angle: 0,
			x: 0,
			y: -2,
			collisionResponse: true,

			// Circle
			radius: 1,

			// Box
			width: 1,
			height: 1,

			// Convex
			vertices: []
		}],

		velocityX: 0,
		velocityY: 0,
		angularVelocity: 0,

		damping: 0,
		angularDamping: 0,

		fixedRotation: false,

		enableSleep: false,

		gravityScale: 1,
		machines: []
	}],
};