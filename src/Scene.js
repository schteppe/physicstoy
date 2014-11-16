var db = require('./Database');

module.exports = new Scene();

function Scene(){

}

Scene.prototype.getById = function(id, callback){
	db.query('SELECT * FROM pt_scenes WHERE id=$1', [id], function (err, result){
		if(err) return callback(err);

		if(!result.rows[0])
			return callback(null, null);

		callback(null, result.rows[0].scene);
	});
};