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

    copy:
      bootstrap:
        files: [
          {
            expand: true
            cwd: 'app/bower_components/bootstrap/dist/css/'
            src: 'bootstrap.min.css'
            dest: 'app/css/'
          }
          {
            expand: true
            cwd: 'app/bower_components/bootstrap/dist/fonts'
            src: '*'
            dest: 'app/fonts/'
          }
        ]

    concat:
      js:
        dest: 'app/js/angular-etc.min.js'
        src: [
          'app/bower_components/angular/angular.min.js'
          'app/bower_components/angular-sanitize/angular-sanitize.min.js'
          'app/bower_components/angular-scroll/angular-scroll.min.js'
          'app/bower_components/angular-i18n/angular-locale_fi-fi.js'
        ]

      dist:
        src: ['app/bower_components/**/*.min.js']
        dest: 'dist/<%= pkg.name %>.js'


  grunt.registerTask "default", [
    "concat"
  ]
