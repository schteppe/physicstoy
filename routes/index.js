var path = require('path');
var db = require(path.join(__dirname, '..', 'src', 'Database'));
var Scene = require(path.join(__dirname, '..', 'src', 'Scene'));
var Validator = require('../src/Validator');

var numPerPage = 12;

// GET /
exports.index = function(req, res, next){
	Scene.listThumbnailData(0, numPerPage, function (err, scenes){
		if(err) return next(err);

		res.render('index', {
			scenes: scenes
		});
	});
};

// GET /browse
// GET /browse?p=0
// GET /browse?p=1
exports.browse = function(req, res, next){
	var page = parseInt(req.query.p, numPerPage);
	if(!isNaN(page)){
		page = Math.max(page, 0);
	} else {
		page = 0;
	}
	var offset = page * numPerPage;

	Scene.listThumbnailData(offset, numPerPage, function (err, scenes){
		if(err) return next(err);

		res.render('browse', {
			scenes: scenes,
			page: page
		});
	});
};

// GET /new
exports.new = function(req, res, next){
	res.render('edit');
};

// GET /:id
exports.view = function(req, res){
	Scene.getById(req.id, function (err, scene){
		if(err) return next(err);

		if(!scene){
			return res.status(404).render('error');
		}

		var upgradedScene = Validator.upgrade(scene);
		if(!upgradedScene){
			console.error('Scene ' + req.id + ' could not be upgraded:\n' + Validator.result);
			return res.status(500).render('error');
		}

		res.render('view', {
			scene: JSON.stringify(upgradedScene)
		});
	});
};

// GET /:id/edit
exports.edit = function(req, res, next){
	Scene.getById(req.id, function (err, scene){
		if(err) return next(err);

		if(!scene){
			return res.status(404).render('error');
		}

		var upgradedScene = Validator.upgrade(scene);
		if(!upgradedScene){
			console.error('Scene ' + req.id + ' could not be upgraded:\n' + Validator.result);
			return res.status(500).render('error');
		}

		res.render('edit', {
			scene: JSON.stringify(upgradedScene)
		});
	});
};

// POST /:id/edit
exports.save = function(req, res, next){
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
		var result = Validator.validate(obj);
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
		db.query('INSERT INTO pt_scenes (scene,version) VALUES($1,$2) RETURNING id', [obj,Validator.CURRENT_VERSION], function (err, result){
			if(err) return next(err);

			var insertId = result.rows[0].id;

			res.redirect('/' + insertId);
		});
	}
};
