function Handler(){
	this.objects = {};
}
Handler.idCounter = 1;

Handler.prototype.getById = function(id){
	return this.objects[id];
};

Handler.prototype.update = function(config){};

Handler.prototype.add = function(config){};

Handler.prototype.remove = function(config){};

Handler.prototype.create = function(){};

Handler.prototype.createId = function(){
	return Handler.idCounter++;
};

Handler.prototype.getIdOf = function(obj){
	for(var id in this.objects){
		if(this.objects[id] === obj) return parseInt(id, 10);
	}
	return -1;
};