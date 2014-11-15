/**
 * Scenes
 */
CREATE TABLE IF NOT EXISTS pt_scenes (
	id serial PRIMARY KEY,
	created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	scene json
);
