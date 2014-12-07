function KeyAction(options){
	Action.apply(this, arguments);
	options = options || {};
	this.keyCode = options.keyCode || -1;
	this.eventType = options.eventType || 'keydown';
	this.toState = options.toState || null;
	this.eventHandler = options.eventHandler || null;
	this.triggered = false;
}
KeyAction.prototype = Object.create(Action.prototype);

KeyAction.prototype.enter = function(machine){
	var that = this;

	// Add handlers
	if(['keydown', 'keyup'].indexOf(this.eventType) !== -1){
		this.eventHandler = function(evt){
			if(evt.keyCode === that.keyCode){
				that.triggered = true;
			}
		};
		document.addEventListener(this.eventType, this.eventHandler);
	}
};

KeyAction.prototype.update = function(machine){
	if(this.triggered){
		machine.requestTransitionToState = this.toState;
		this.triggered = false;
	}
};

KeyAction.prototype.exit = function(){
	if(this.eventHandler){
		document.removeEventListener(this.eventType, this.eventHandler);
	}
	this.eventHandler = null;
	this.triggered = false;
};
