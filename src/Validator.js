var validate = require('jsonschema').validate;
var schema;

exports.validate = function(object){
	return validate(object, schema);
};

schema = {
	type: "object",
	properties: {
		world: {
			type: "object",
			properties: {
				gravityX: { type: "string" },
				gravityY: { type: "number" },

				fps : { type: "number" },
				maxSubSteps : { type: "number" },
				sleepMode : { type: "string" },
			},
			additionalProperties: false
		},

		renderer : {
			type: "object",
			properties: {
				contacts: { type: "boolean" },
				aabbs: { type: "boolean" },
				constraints: { type: "boolean" }
			},
			additionalProperties: false
		},

		solver : {
			type: "object",
			properties: {
				iterations: { type: "number" },
				stiffness: { type: "number" },
				relaxation: { type: "number" },
				tolerance: { type: "number" },
			},
			additionalProperties: false
		},

		bodies: {
			type: "array",
			minItems: 1,
			maxItems: 999,
			items: {
				type: "object",
				properties: {
					id: { type: "number" },
					name: { type: "string" },
					x: { type: "number" },
					y: { type: "number" },
					angle: { type: "number" },
					type: { type: "string" },
					mass: { type: "number" },
					collisionResponse: { type: "boolean" },
					velocityX: { type: "number" },
					velocityY: { type: "number" },
					angularVelocity: { type: "number" },
					damping: { type: "number" },
					angularDamping: { type: "number" },
					fixedRotation: { type: "boolean" },
					enableSleep: { type: "boolean" },
					gravityScale: { type: "number" },

					machines: {
						type: "array",
						maxItems: 0 // Not yet
					},

					shapes: {
						type: "array",
						maxItems: 999,
						properties: {
							id: { type: "number" },
							name: { type: "string" },
							type: { type: "string" },
							color: { type: "string" },
							angle: { type: "number" },
							x: { type: "number" },
							y: { type: "number" },
							collisionResponse: { type: "boolean" },

							// Circle
							radius: { type: "number" },

							// Box
							width: { type: "number" },
							height: { type: "number" },

							// Convex
							vertices: {
								type: "array",
								maxItems: 0 // not yet
							}
						},
						additionalProperties: false
					}
				},
				additionalProperties: false
			}
		}
	},
	additionalProperties: false
};