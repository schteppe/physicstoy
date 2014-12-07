var express = require("express");
var path = require("path");
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var db = require(path.join(__dirname, 'src', 'Database'));
var scene = require(path.join(__dirname, 'src', 'Scene'));
var Validator = require(path.join(__dirname, 'src', 'Validator'));

var routes = require(path.join(__dirname, 'routes'));
var Middleware = require(path.join(__dirname, 'src', 'Middleware'));

var app = express();

var port = Number(process.env.PORT || 5000);

app.set('port', port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(serveStatic(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(Middleware.locals());

app.all('*', Middleware.id());

app.get ('/', routes.index);
app.get (/^\/(\d+)$/, routes.view);
app.get ('/new', routes.new);
app.post('/new', routes.save);
app.get (/^\/(\d+)\/edit$/, routes.edit);
app.post(/^\/(\d+)\/edit$/, routes.save);

db.sync({
	verbose: true
}, function (err){
	if(err) throw err;

	app.listen(port, function() {
		console.log("Listening on port " + port + " ("+app.get('env')+")");
	});
});

// Try validating everything on start
if(app.get('env') === 'development'){
	scene.forEach(function (scene, row){

		var upgradedScene = Validator.upgrade(scene);
		if(!upgradedScene){
			console.error('Scene ' + row.id + ' (v' + scene.version + ') could not be upgraded:\n' + Validator.result);
		}

	}, function (err){
		if(err) throw err;

		console.log('Validated all scenes');
	});
}