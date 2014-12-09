document.addEventListener("DOMContentLoaded", function(event) {

	// Init thumbnails
	var canvases = document.getElementsByClassName('thumbnail');
	for (var i = 0; i < canvases.length; i++) {
		var canvas = canvases[i];
		var ctx = canvas.getContext('2d');
		var children = canvas.childNodes;
		var scriptNode;
		for(var j=0; j<children.length; j++){
			if(children[j].type === 'application/json')
				scriptNode = children[j];
		}
		try {
			var scene = JSON.parse(scriptNode.innerHTML);
			Thumbnail.drawOnCanvas(ctx, scene, canvas.width, canvas.height, {});
		} catch(err){
			console.error(err);
		}
	}
});