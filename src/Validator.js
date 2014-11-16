var validate = require('jsonschema').validate;
var schema;

module.exports = Validator;

function Validator(){}

Validator.CURRENT_VERSION = 2;

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
var id = { type: "integer", minimum: 1, required: true };
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
					collisionResponse: bool,
					velocityX: num,
					velocityY: num,
					angularVelocity: num,
					damping: num,
					angularDamping: num,
					fixedRotation: bool,
					enableSleep: bool,
					gravityScale: num,

					machines: {
						type: "array",
						required: true,
						maxItems: 0 // Not yet
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

								// Circle
								radius: num,

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
		}
	}
};