var validate = require('jsonschema').validate;
var schema;

module.exports = Validator;

function Validator(){}

Validator.CURRENT_VERSION = 10;

Validator.validate = function(object){
	return validate(object, schema);
};

// This one stays here for now...
Validator.upgrade = function(obj){
	if(!obj || typeof(obj) !== "object"){
		return false;
	}

	var version;
	if(typeof(obj.version) === 'number'){
		version = obj.version;
	} else {
		version = 1;
	}

	// Clone object
	obj = JSON.parse(JSON.stringify(obj));

	// Upgrade
	switch(version){

	case 1:
		obj.version = 2;
		break;

	case 2:
		obj.springs = [];
		obj.version = 3;
		break;

	case 3:
		obj.constraints = [];
		obj.version = 4;
		break;

	case 4:
		// Add "length" property to all shapes
		obj.version = 5;
		for(var i=0; i<obj.bodies.length; i++){
			for(var j=0; j<obj.bodies[i].shapes.length; j++){
				obj.bodies[i].shapes[j].length = 1; // default
			}
		}
		break;

	case 5:
		obj.materials = [];
		obj.contactMaterials = [];
		obj.version = 6;
		for(var i=0; i < obj.bodies.length; i++){
			obj.bodies[i].material = 0;
		}
		break;

	case 6:
		obj.version = 7;
		for(var i=0; i < obj.bodies.length; i++){
			obj.bodies[i].collisionGroup = 1;
			obj.bodies[i].collisionMask = 1;
		}
		break;

	case 7:
		obj.version = 8;
		break;

	case 8:
		obj.version = 9;
		// Added velocityXY,angularVelocity to all actions
		for(var i=0; i < obj.bodies.length; i++){
			var body = obj.bodies[i];

			for (var j = 0; j < body.machines.length; j++) {
				var machine = body.machines[j];

				for (var k = 0; k < machine.states.length; k++) {
					var state = machine.states[k];

					for (var l = 0; l < state.actions.length; l++) {
						var action = state.actions[l];
						action.velocityX = 0;
						action.velocityY = 0;
						action.angularVelocity = 0;
					}
				}
			}
		}
		break;

	case 9:
		obj.version = 10;
		// Added forceXY,angularForce to all actions
		for(var i=0; i < obj.bodies.length; i++){
			var body = obj.bodies[i];

			for (var j = 0; j < body.machines.length; j++) {
				var machine = body.machines[j];

				for (var k = 0; k < machine.states.length; k++) {
					var state = machine.states[k];

					for (var l = 0; l < state.actions.length; l++) {
						var action = state.actions[l];
						action.forceX = 0;
						action.forceY = 0;
						action.angularForce = 0;
					}
				}
			}
		}
		break;

	case 10:
		break;

	default:
		return false;

	}

	// Are we done?
	if(version === Validator.CURRENT_VERSION){
		var result = Validator.validate(obj);
		Validator.result = result;
		if(!result.valid){
			return false;
		}
		return obj;
	} else {
		return Validator.upgrade(obj);
	}
};

var num = { type: "number", required: true };
var integer = { type: "integer", required: true };
var id = { type: "integer", minimum: 0, required: true };
var str = { type: "string", required: true, maxLength: 1000 };
var bool = { type: "boolean", required: true };

schema = {
	type: "object",
	additionalProperties: false,
	required: true,
	properties: {
		version: {
			type: "integer",
			required: true,
			minimum: Validator.CURRENT_VERSION,
			maximum: Validator.CURRENT_VERSION
		},

		world: {
			type: "object",
			required: true,
			additionalProperties: false,
			properties: {
				gravityX: num,
				gravityY: num,

				fps : integer,
				maxSubSteps : integer,
				sleepMode : str,
			}
		},

		renderer : {
			type: "object",
			required: true,
			additionalProperties: false,
			properties: {
				contacts: bool,
				aabbs: bool,
				constraints: bool
			}
		},

		solver : {
			type: "object",
			required: true,
			additionalProperties: false,
			properties: {
				iterations: { type: "integer", minimum: 0, required: true },
				stiffness: num,
				relaxation: num,
				tolerance: num,
			}
		},

		springs: {
			type: "array",
			required: true,
			minItems: 0,
			maxItems: 999,
			items: {
				type: "object",
				required: true,
				additionalProperties: false,
				properties: {
					id: id,
					bodyA: id,
					bodyB: id,
					type: str,
					name: str,
					stiffness: num,
					damping: num,
					useInitialRestLength: bool,
					restLength: num, // Both linear and angular

					// Linear
					localAnchorAX: num,
					localAnchorAY: num,
					localAnchorBX: num,
					localAnchorBY: num
				}
			}
		},

		bodies: {
			type: "array",
			required: true,
			minItems: 1,
			maxItems: 999,
			items: {
				type: "object",
				required: true,
				additionalProperties: false,
				properties: {
					id: id,
					name: str,
					x: num,
					y: num,
					angle: num,
					type: str,
					mass: num,
					material: id,
					collisionResponse: bool,
					velocityX: num,
					velocityY: num,
					angularVelocity: num,
					damping: num,
					angularDamping: num,
					fixedRotation: bool,
					enableSleep: bool,
					gravityScale: num,
					collisionGroup: integer,
					collisionMask: integer,

					machines: {
						type: "array",
						required: true,
						maxItems: 999,
						items: {
							type: "object",
							required: true,
							additionalProperties: false,
							properties: {
								id: id,
								name: str,
								log: bool,
								states: {
									type: "array",
									required: true,
									maxItems: 999,
									items: {
										type: "object",
										required: true,
										additionalProperties: false,
										properties: {
											id: id,
											name: str,
											actions: {
												type: "array",
												required: true,
												maxItems: 999,
												items: {
													type: "object",
													required: true,
													additionalProperties: false,
													properties: {
														id: id,
														type: str,

														positionX: num,
														positionY: num,
														angle: num,

														velocityX: num,
														velocityY: num,
														angularVelocity: num,

														forceX: num,
														forceY: num,
														angularForce: num,

														time: num,
														toState: id,

														keyCode: integer,
														eventType: str
													}
												}
											}
										}
									}
								}
							}
						}
					},

					shapes: {
						type: "array",
						required: true,
						maxItems: 999,
						items: {
							type: "object",
							required: true,
							additionalProperties: false,
							properties: {
								id: id,
								name: str,
								type: str,
								color: str,
								angle: num,
								x: num,
								y: num,
								collisionResponse: bool,

								// Circle, Capsule
								radius: num,

								// Capsule
								length: num,

								// Box
								width: num,
								height: num,

								// Convex
								vertices: {
									type: "array",
									required: true,
									maxItems: 0 // not yet
								}
							}
						}
					}
				}
			}
		},

		constraints: {
			type: "array",
			required: true,
			minItems: 0,
			maxItems: 999,
			items: {
				type: "object",
				required: true,
				additionalProperties: false,
				properties: {
					id: id,
					type: str, // distance, lock, slider, hinge, gear

					name: str,

					stiffness: num,
					relaxation: num,
					bodyA: id,
					bodyB: id,
					collideConnected: bool,
					maxForce: num,

					// distance, slider, hinge
					localAnchorAX: num,
					localAnchorAY: num,
					localAnchorBX: num,
					localAnchorBY: num,

					// distance
					useCurrentDistance: bool,
					distance: num,

					// distance, hinge
					upperLimitEnabled: bool,
					lowerLimitEnabled: bool,
					upperLimit: num,
					lowerLimit: num,

					// gear
					ratio: num,
					useCurrentRelAngle: bool,
					relAngle: num,

					// slider
					localAxisAX: num,
					localAxisAY: num,
					disableRotationalLock: bool,

					// Slider, hinge
					motorEnabled: bool,
					motorSpeed: num
				},
			},
		},

		materials: {
			type: "array",
			required: true,
			minItems: 0,
			maxItems: 999,
			items: {
				type: "object",
				required: true,
				additionalProperties: false,
				properties: {
					id: id,
					name: str
				}
			}
		},

		contactMaterials: {
			type: "array",
			required: true,
			minItems: 0,
			maxItems: 999,
			items: {
				type: "object",
				required: true,
				additionalProperties: false,
				properties: {
					id: id,
					name: str,

					materialA: id,
					materialB: id,

					friction: num,
					restitution: num,
					stiffness: num,
					relaxation: num,
					frictionStiffness: num,
					frictionRelaxation: num,
					surfaceVelocity: num
				}
			}
		}
	}
};