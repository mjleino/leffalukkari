"use strict"

module.exports = (grunt) ->
  grunt.loadNpmTasks "grunt-bower-task"
  grunt.loadNpmTasks "grunt-contrib-copy"
  grunt.loadNpmTasks "grunt-contrib-concat"

  grunt.initConfig

    pkg: grunt.file.readJSON "package.json"
    
    bower:
      install:
        options:
          install: false
          layout: "byType"

    concat:
      js:
        dest: 'app/js/jq-angular-bootstrap.min.js'
        src: [
          'app/bower_components/jquery/dist/jquery.min.js'
          'app/bower_components/angular/angular.min.js'
          'app/bower_components/angular-sanitize/angular-sanitize.min.js'
          'app/bower_components/angular-scroll/angular-scroll.min.js'
          'app/bower_components/bootstrap/dist/js/bootstrap.min.js'
        ]

      dist:
        src: ['app/bower_components/**/*.min.js']
        dest: 'dist/<%= pkg.name %>.js'


  grunt.registerTask "default", [
    "concat"
  ]
