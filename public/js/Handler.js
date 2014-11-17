function Handler(){
	this.objects = {};
}

Handler.prototype.getById = function(id){
	return this.objects[id];
};

Handler.prototype.update = function(config){};

Handler.prototype.add = function(config){};

Handler.prototype.remove = function(config){};

Handler.prototype.create = function(){};

var idCounter = 1;
Handler.prototype.createId = function(){
	return idCounter++;
};