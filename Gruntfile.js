module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            dist: {
                src: [
                    'public/js/Color.js',
                    'public/js/Renderer.js',
                    'public/js/WebGLRenderer.js',
                    'public/js/handlers/Handler.js',
                    'public/js/handlers/RendererHandler.js',
                    'public/js/handlers/SolverHandler.js',
                    'public/js/handlers/ShapeHandler.js',
                    'public/js/handlers/WorldHandler.js',
                    'public/js/handlers/SpringHandler.js',
                    'public/js/handlers/ConstraintHandler.js',
                    'public/js/handlers/MachineHandler.js',
                    'public/js/handlers/MaterialHandler.js',
                    'public/js/handlers/ContactMaterialHandler.js',
                    'public/js/handlers/BodyHandler.js',
                    'public/js/handlers/ActionHandler.js',
                    'public/js/handlers/StateHandler.js',
                    'public/js/handlers/SceneHandler.js',
                    'public/js/fsm/Machine.js',
                    'public/js/fsm/KeyAction.js',
                    'public/js/fsm/SetPositionAction.js',
                    'public/js/fsm/SetVelocityAction.js',
                    'public/js/fsm/WaitAction.js',
                    'public/js/fsm/AddForceAction.js'
                ],
                dest: 'public/js/PhysicsToy.js',
            },
        },

        uglify : {
            physicstoy : {
                src : ['public/js/PhysicsToy.js'],
                dest : 'public/js/PhysicsToy.min.js'
            },
            pixi : {
                src : ['public/js/lib/pixi.js'],
                dest : 'public/js/lib/pixi.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', [
        'concat',
        'uglify'
    ]);

};
