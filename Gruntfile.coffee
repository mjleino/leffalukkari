"use strict"

module.exports = (grunt) ->
  grunt.loadNpmTasks "grunt-contrib-concat"
  grunt.loadNpmTasks "grunt-wget"

  grunt.initConfig

    pkg: grunt.file.readJSON "package.json"
    
    # pack angular & services into one js. locale on its own.
    concat:
      angular:
        options:
          sourceMap: true
        dest: 'app/js/dist/angular-etc.min.js'
        src: [
          'node_modules/angular/angular.min.js'
          'node_modules/angular-sanitize/angular-sanitize.min.js'
          'node_modules/angular-scroll/angular-scroll.min.js'
          'node_modules/ngstorage/ngStorage.min.js'
        ]

      angular_locale:
        dest: 'app/js/dist/angular-locale_fi-fi.js'
        src: [
          'node_modules/angular-i18n/angular-locale_fi-fi.js'
        ]

    # fetch our libraries for offline development on off-the-grid cabin.
    wget:
      basic:
        options:
          overwrite: true
        files: {
          'app/js/dist/facebook.js': 'http://connect.facebook.net/en_US/sdk.js'
          'app/js/dist/firebase.js': 'http://www.gstatic.com/firebasejs/3.8.0/firebase.js'
        }

  grunt.registerTask "default", [
    "concat"
  ]
