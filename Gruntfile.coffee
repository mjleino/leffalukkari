"use strict"

module.exports = (grunt) ->
  grunt.loadNpmTasks "grunt-contrib-concat"

  grunt.initConfig

    pkg: grunt.file.readJSON "package.json"
    
    concat:
      angular:
        dest: 'js/dist/angular-etc.min.js'
        src: [
          'node_modules/angular/angular.min.js'
          'node_modules/angular-sanitize/angular-sanitize.min.js'
          'node_modules/angular-scroll/angular-scroll.min.js'
          'node_modules/ngstorage/ngStorage.min.js'
        ]

      angular_locale:
        dest: 'js/dist/angular-locale_fi-fi.js'
        src: [
          'node_modules/angular-i18n/angular-locale_fi-fi.js'
        ]

  grunt.registerTask "default", [
    "concat"
  ]
