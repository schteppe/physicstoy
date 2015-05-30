var db = require('./Database');
var Validator = require('../src/Validator');

module.exports = new Scene();

function Scene(){
	this.cachedObjects = {};
	this.cachedThumbnails = {};
}

Scene.prototype.getCachedSceneById = function(id){
	this.reap();
	return this.cachedObjects[id];
};

Scene.prototype.cacheScene = function(id, scene){
	this.cachedObjects[id] = JSON.parse(JSON.stringify(scene)); // clone
	this.reap();
};

// Purge old
Scene.prototype.reap = function(){

	// Remove overflowing cached scenes
	var keys = Object.keys(this.cachedObjects);
	var deleteId;
	while(keys.length > (process.env.PHYSICSTOY_MAX_CACHED_SCENES || 3)){
		deleteId = keys.shift();
		delete this.cachedObjects[deleteId];
	}

	var that = this;
	var cachedThumbnails = this.cachedThumbnails;

	// Sort browse results by age
	keys = Object.keys(cachedThumbnails).sort(function (keyA, keyB){
		return cachedThumbnails[keyA].created - cachedThumbnails[keyB].created;
	});

	// remove overflowing
	while(keys.length > (process.env.PHYSICSTOY_MAX_CACHED_THUMBNAIL_PAGES || 3)){
		deleteId = keys.shift();
		delete cachedThumbnails[deleteId];
	}

	// Remove old
	var now = Date.now();
	while(keys.length && now - cachedThumbnails[keys[0]].created > (process.env.PHYSICSTOY_MAX_CACHE_AGE || 10000)){
		deleteId = keys.shift();
		delete cachedThumbnails[deleteId];
	}
};

Scene.prototype.getCachedThumbnails = function(offset, limit){
	this.reap();
	var cached = this.cachedThumbnails[offset + '_' + limit];
	if(cached){
		return cached.scenes;
	}
};

Scene.prototype.cacheThumbnailData = function(offset, limit, scenes){
	this.cachedThumbnails[offset + '_' + limit] = {
		created: Date.now(),
		scenes: JSON.parse(JSON.stringify(scenes))
	};
	this.reap();
};

Scene.prototype.getById = function(id, callback){

	// cached?
	var cachedScene = this.getCachedSceneById(id);
	if(cachedScene){
		return callback(null, cachedScene);
	}

	var that = this;

	db.query('SELECT * FROM pt_scenes WHERE id=$1', [id], function (err, result){
		if(err) return callback(err);

		if(!result.rows[0])
			return callback(null, null);

		that.cacheScene(id, result.rows[0].scene);

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

	// Get cached?
	var scenes = this.getCachedThumbnails(offset, limit);
	if(scenes)
		return callback(null, scenes);

	var that = this;
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

		that.cacheThumbnailData(offset, limit, scenes);

		callback(null, scenes);
	});
};

Scene.prototype.insert = function(scene, callback){
	db.query('INSERT INTO pt_scenes (scene,version) VALUES($1,$2) RETURNING id', [scene, Validator.CURRENT_VERSION], function (err, result){
		if(err) return callback(err);

		var insertId = result.rows[0].id;

		callback(null, insertId);
	});
};