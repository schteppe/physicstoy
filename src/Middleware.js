module.exports = Middleware;

function Middleware(){}

Middleware.id = function(options){
	return function (req, res, next){
		var matches = req.params[0].match(/^\/(\d+)/);
		if (matches && matches.length) {
			req.id = res.locals.id = parseInt(matches[1], 10);
		}
		next();
	};
};