var db = require('./Database');
var Validator = require('../src/Validator');

module.exports = new Scene();

function Scene(){}

Scene.prototype.getById = function(id, callback){
	db.query('SELECT * FROM pt_scenes WHERE id=$1', [id], function (err, result){
		if(err) return callback(err);

		if(!result.rows[0])
			return callback(null, null);

		callback(null, result.rows[0].scene);
	});
};

Scene.prototype.forEach = function(iterator, callback){
	var id = 0;
	function doNext(){
		db.query('SELECT * FROM pt_scenes WHERE id>$1 ORDER BY id ASC LIMIT 1', [id], function (err, result){

			if(err) return callback(err);

			if(result.rows.length && result.rows[0].scene){
				var row = result.rows[0];
				iterator(row.scene, row);
				id = row.id;
				doNext();
			} else {
				callback(null);
			}
		});
	}

	doNext();
};

Scene.prototype.listThumbnailData = function(offset, limit, callback){

	db.query('SELECT * FROM pt_scenes ORDER BY id DESC OFFSET $1 LIMIT $2', [offset, limit], function (err, result){
		if(err) return callback(err);

		// Upgrade all of the data
		var scenes = [];
		for (var i = 0; i < result.rows.length; i++) {
			var row = result.rows[i];

			var upgradedScene = Validator.upgrade(row.scene);
			if(upgradedScene){
				var data = {
					id: row.id,
					scene: {
						bodies: []
					}
				};
				for (var j = 0; j < upgradedScene.bodies.length; j++) {
					var body = upgradedScene.bodies[j];
					var bodyData = {
						x: body.x,
						y: body.y,
						angle: body.angle,
						shapes: []
					};
					for (var k = 0; k < body.shapes.length; k++) {
						var shape = body.shapes[k];
						var shapeData = {
							type: shape.type,
							x: shape.x,
							y: shape.y,
							angle: shape.angle,
							color: shape.color,
							width: shape.width,
							height: shape.height,
							radius: shape.radius,
							length: shape.length,
							vertices: shape.vertices
						};
						bodyData.shapes.push(shapeData);
					}
					data.scene.bodies.push(bodyData);
				}
				scenes.push(data);
			}
		}

		callback(null, scenes);
	});
};