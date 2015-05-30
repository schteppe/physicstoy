/**
 * Scenes
 */
CREATE TABLE IF NOT EXISTS pt_scenes (
	id serial PRIMARY KEY,
	created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	md5sum text,
	scene json,
	CONSTRAINT pt_scenes_md5sum_key UNIQUE (md5sum)
);
