var path = require('path');
var db = require(path.join(__dirname, '..', 'src', 'Database'));
var validate = require('../src/Validator').validate;

var scene;

// GET /
exports.index = function(req, res){
	res.render('index');
};

// GET /new
exports.new = function(req, res){
	res.render('edit');
};

// GET /:id
exports.view = function(req, res){
	db.query('SELECT * FROM pt_scenes WHERE id=$1', [req.id], function (err, result){
		if(err) return next(err);

		if(!result.rows.length){
			return res.status(404).render('error');
		}

		res.render('view', {
			scene: JSON.stringify(result.rows[0].scene)
		});
	});
};

// GET /:id/edit
exports.edit = function(req, res){
	res.render('edit', {
		scene: JSON.stringify(scene)
	});
};

// POST /:id/edit
exports.save = function(req, res){
	var obj;
	var errors = [];
	try {
		obj = JSON.parse(req.body.scene);
	} catch (err) {
		obj = false;
	}

	if(!obj){
		errors.push('Could not parse JSON.');
	} else {
		var result = validate(obj);
		if(!result.valid){
			var errs = result.errors.map(function(err){ return err.stack; }).join(', ');
			errors.push('Sorry, the scene data was not valid: ' + errs);
		}
	}

	if(errors.length){
		res.render('edit', {
			errors: errors,
			scene: req.body.scene
		});
	} else {

		db.query('INSERT INTO pt_scenes (scene) VALUES($1) RETURNING id', [obj], function (err, result){
			if(err) return next(err);

			var insertId = result.rows[0].id;

			res.redirect('/' + insertId);
		});
	}
};

scene = {
	world: {
		gravityX : 0,
		gravityY : -20,
		fps : 60,
		maxSubSteps : 3,
		sleepMode : "NO_SLEEPING"
	},

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
