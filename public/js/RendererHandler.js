function RendererHandler(renderer){
	Handler.call(this);
	this.renderer = renderer;
}
RendererHandler.prototype = Object.create(Handler.prototype);

RendererHandler.prototype.create = function(){
	return {
		contacts: false,
		aabbs: false,
		constraints: false
	};
};

RendererHandler.prototype.update = function(config){
	var renderer = this.renderer;
	renderer.drawAABBs = config.aabbs;
};