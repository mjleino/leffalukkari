"use strict";

console.log("\
       _ _ _        _             _       _      _             _ _       \n\
__   _(_|_) | _____(_)_ __   ___ (_) __ _| |_   (_) __ _ _ __ (_) |_ ___ \n\
\\ \\ / / | | |/ / __| | '_ \\ / _ \\| |/ _` | __|  | |/ _` | '_ \\| | __/ _ \\\n\
 \\ V /| | |   <\\__ \\ | |_) | (_) | | (_| | |_   | | (_| | | | | | ||  __/\n\
  \\_/ |_|_|_|\\_\\___/_| .__/ \\___// |\\__,_|\\__|  |_|\\__, |_| |_|_|\\__\\___|\n\
                     |_|       |__/                |___/                 ")

var app = angular.module("leffalukkari", ["ngSanitize", "duScroll", "ngStorage"])

app.value('duScrollGreedy', true)

app.controller("FilmListCtrl", function($scope, $http, $filter, $timeout, $localStorage) {
	$scope.search = { } // https://github.com/oblador/angular-scroll/issues/43
	$scope.now = new Date()

	$scope.$storage = $localStorage.$default({
		selected: { }
	})

	fbShareCheck()

	// FETCH & PROCESS
	$http.get("data/cinedata.json")
	.then(function(result) {
		$scope.data = result.data

		$scope.data.screeningsById = { }
		$scope.data.screenings.forEach(function(screening) {
			if (screening.id in $scope.data.screeningsById)
				console.log("DUPLICATE SCREENING ID", screening.id)
			$scope.data.screeningsById[screening.id] = screening
		})

		console.log("LOADING DONE", $scope.data)
		window.DATA = $scope.data // DEBUGS
	})

	// BEHAVIOUR FUNCTIONS

	$scope.showKlik = function(screening) {
		console.log(screening)

		if (screening.id in $scope.$storage.selected)
			delete $scope.$storage.selected[screening.id]
		else $scope.$storage.selected[screening.id] = Date.now()

		ga('send', 'event', $scope.$storage.selected[screening.id] ? 'select' : 'unselect', screening.id)
	}

	$scope.myFestival = function() {
		$scope.search.myfestival = ! $scope.search.myfestival
		ga('send', 'event', $scope.search.myfestival ? 'click' : 'unclick', 'myfestival')
	}

	$scope.myFestivalCheck = function(screeningOrId, index, array) {
		if (! $scope.search.myfestival) {
			delete $scope.selectedCopy
			return true
		}

		var id = angular.isObject(screeningOrId) ? screeningOrId.id : screeningOrId

		// make a copy so films won't disappera when unclicked in my festival view
		if (! $scope.selectedCopy) {
			$scope.selectedCopy = angular.copy($scope.$storage.selected)
		}

		return $scope.selectedCopy[id] || $scope.fbshare[id]
	}

	$scope.doFbShare = function() {
		console.log("FBSHARE", $scope.$storage.selected)
		ga('send', 'event', 'click', 'fbshare')

		var selected = Object.keys($scope.$storage.selected)

		var titles = selected.map(function(id) {
			return $scope.data.screeningsById[id].title
		})

		FB.ui({
			method: 		'share',
			picture: 		'http://www.espoocine.fi/2015/fi/Image/6884/etusivu.jpg',
			// description: 	'Tule kanssani elokuviin ❤︎ Come with me to movies!',
			description: 	titles.join(", "),
			href: 			'http://www.espoocine.fi/2015/fi/ohjelmisto/leffalukkari/#share=' + selected.join(",")
		}, function(response) {
			// console.log("FB", response)
		})
	}

	function fbShareCheck() {
		$scope.fbshare = { }

		if (location.hash.search(/^#share=/) < 0) return
		
		var ids = location.hash.split("=")[1].split(",")
		ids.forEach(function(id) {
			$scope.fbshare[id] = true
		})

		// location.hash = "#share" // META
		// $scope.myFestival() // IGNITE
	}

	// https://github.com/angular/angular.js/issues/4608
	$scope.scrollTo = function(hash) {
		$timeout(function () {
			// $location.hash(hash)
			$anchorScroll(hash)
		})
	}

	// observe final tbody so we know when table has loaded
	$scope.$watch(
		function () {
			return document.getElementById('su-30')
		}, function(value, old) {
			if (! value) return
			if (! containsDate($scope.now, $scope.data.days)) return

			// console.log("YO!! scrolling in today")
			// TODO scrollTo DEPRECATED 
			$scope.scrollTo(getDateId($scope.now))

			$timeout(function() {
				$("[data-spy]").scrollspy('refresh')
			})
		}
	)

	// HELPER FUNCTIONS

	function getScreeningId(screening) {
		return [screening.url, screening.number.split("/")[0]].join("-")
	}

	function getDateId(d) {
		return $filter('date')(d, 'EEE-dd')
	}

	function containsDate(date, days) {
		var today = $filter('date')(date, 'yyyy-MM-dd')
		for (var d in days) {
			// console.log(today, "vs", days[d].date)
			if (today == days[d].date) return true
		}
		return false
	}

	function getTimeslot(t) {
		var timeslots = $scope.data.config.timeslots
		// if t < 1st timeslot, ALL HELL BREAKS LOOSE
		var h = parseInt(t.substring(0, 2), 10)
		for (var i = 0; i < timeslots.length; i++)
			if (i == timeslots.length-1 || h >= timeslots[i] && h < timeslots[i+1])
				return timeslots[i]
	}
})

// DIRECTIVE & FILTER

app.directive("screening", function() {
	return {
		templateUrl: "templates/screening.html"
	}
})

// https://codeforgeek.com/2014/12/highlight-search-result-angular-filter/
app.filter('highlight', function() {
	return function(text, phrase) {
		if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'), '<mark>$1</mark>')

		return text
	}
})

app.filter('count', function() {
	return function(obj) {
		if (angular.isObject(obj)) return Object.keys(obj).length
		return obj.length
	}
})

app.filter('timeslotNugger', function() {
	return function(timeslot) {
		var ids = [ ]
		angular.forEach(timeslot.theaters, function(theater) {
			ids = ids.concat(theater)
		})
		return ids
	}
})
