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
		// ultimate nuggetrium data format for easy viewing
		$scope.data = result.data
		$scope.data.days = { }
		var data = $scope.data

		var theaterObject = {}
		angular.forEach(data.config.theaters, function(theater, i) {
			theaterObject[theater] = {
				"screenings": []
			}
		})

		var timeslotsObject = {}
		angular.forEach(data.config.timeslots, function(timeslot, i) {
			timeslotsObject[timeslot] = {
				"time": (timeslot < 10 ? "0" : "") + timeslot + ":00",
				"theaters": angular.copy(theaterObject),
				"count": 0,
				"duration": 0
			}
		})

		var dayObject = {
			"timeslots": { }
		}

		// let's poop all the screenings to their proper boxes
		angular.forEach(data.screenings, function(screening) {
			var datetime = new Date(screening.date + "T" + screening.time + "+03:00")

			screening.id       = getScreeningId(screening)
			screening.datetime = datetime.toISOString() // could be in data.json
			screening.dateId   = getDateId(datetime)
			screening.timeslot = getTimeslot(screening.time)

			var timeslotdatetime = new Date(datetime)
			timeslotdatetime.setUTCHours(screening.timeslot-3, 0) // HOX -03:00
			screening.timeslotdiff = (datetime-timeslotdatetime)/1000/60

			if (! (screening.dateId in data.days)) {
				data.days[screening.dateId] = angular.copy(dayObject)
				data.days[screening.dateId].id    = screening.dateId
				data.days[screening.dateId].date  = screening.date
			}
			if (! (screening.timeslot in data.days[screening.dateId].timeslots)) {
				data.days[screening.dateId].timeslots[screening.timeslot] 
					= angular.copy(timeslotsObject[screening.timeslot])
			}

			if (data.config.theaters.indexOf(screening.theater) < 0)
				screening.special = true

			data.days[screening.dateId]
				.timeslots[screening.timeslot]
				.theaters[screening.special ? data.config.theaters[data.config.theaters.length-1] : screening.theater]
				.screenings.push(screening)

			var timeslotduration = screening.timeslotdiff + screening.duration
			if (timeslotduration > data.days[screening.dateId].timeslots[screening.timeslot].duration)
				data.days[screening.dateId].timeslots[screening.timeslot].duration = timeslotduration

			data.days[screening.dateId].timeslots[screening.timeslot].count++
		})

		// POST-PROCESS HACKS
		data.days["ti-25"].timeslots[12] = angular.copy(timeslotsObject[12])

		console.log("LOADING DONE", data)
		window.DATA = data
		// scope is at: angular.element($("[ng-controller]")).scope()
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

	$scope.myFestivalCheck = function(screening, index, array) {
		if (! $scope.search.myfestival) {
			delete $scope.selectedCopy
			return true
		}

		// make a copy so films won't disappera when unclicked in my festival view
		if (! $scope.selectedCopy) $scope.selectedCopy = angular.copy($scope.$storage.selected)

		return $scope.selectedCopy[screening.id] || $scope.fbshare[screening.id]
	}

	$scope.doFbShare = function() {
		console.log("FBSHARE", selected)
		ga('send', 'event', 'click', 'fbshare')

		var selected = Object.keys($scope.$storage.selected)

		var titles = [ ]
		$scope.data.screenings.forEach(function(screening) {
			if ($scope.$storage.selected[screening.id])
				titles.push(screening.title)
		})

		FB.ui({
			method: 		'share',
			picture: 		'http://www.espoocine.fi/2015/fi/Image/6884/etusivu.jpg',
			// description: 	'Tule kanssani elokuviin ❤︎ Come with me to movies!',
			description: 	titles.join(", "),
			href: 			'http://demo.viiksipojat.fi/leffalukkari#share=' + selected.join(",")
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
