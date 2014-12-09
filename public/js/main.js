document.addEventListener("DOMContentLoaded", function(event) {

	// Init thumbnails
	var containers = document.getElementsByClassName('thumbnail');
	var dpr = window.devicePixelRatio || 1;
	for (var i = 0; i < containers.length; i++) {
		var container = containers[i];

		var canvas = document.createElement('CANVAS');
		canvas.width = 100 * dpr;
		canvas.height = 100 * dpr;
		container.appendChild(canvas);
		var ctx = canvas.getContext('2d');

		var children = container.childNodes;
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