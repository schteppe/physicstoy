var fs = require('fs');
var pg = require('pg');
var path = require('path');

module.exports = new Database();

pg.defaults.poolSize = typeof(process.env.PHYSICSTOY_MAX_DB_CONNECTIONS) !== 'undefined' ? parseInt(process.env.PHYSICSTOY_MAX_DB_CONNECTIONS, 10) : 10;

console.log(pg.defaults.poolSize)

function Database(){

}

Database.prototype.query = function(query, values, callback){
	pg.connect(process.env.DATABASE_URL, function (err, client, done) {
		if(err) return callback(err);

		client.query(query, values, function (err, result) {
			done();
			callback(err, result);
		});
	});
};

Database.prototype.sync = function(options, callback){
	options = options || {};

	var that = this;

	fs.readFile(path.join(__dirname, '..', 'init.sql'), {
		encoding: 'utf8'
	}, function (err, data) {
		if (err) return callback(err);

		var matches = data.match(/CREATE TABLE IF NOT EXISTS pt_([a-zA-Z0-9_]+)/g);
		var pre = '';
		if(matches && matches.length && process.env.PHYSICSTOY_DB_FORCE_CREATE){
			while (matches.length) {
				var table = matches.pop().replace('CREATE TABLE IF NOT EXISTS ','');
				pre += 'DROP TABLE IF EXISTS ' + table + ';\n';
			}
		}

		if(options.force || process.env.PHYSICSTOY_DB_FORCE_CREATE){
			data = data.replace(/IF NOT EXISTS /g, '');
		}

		if(process.env.PHYSICSTOY_TABLE_PREFIX){
			data = data.replace(/pt_/g, process.env.PHYSICSTOY_TABLE_PREFIX);
		}

		data = pre + data;
		if(options.verbose || process.env.PHYSICSTOY_DB_VERBOSE_CREATE){
			console.log(data);
		}

		that.query(data, [], callback);
	});
};

