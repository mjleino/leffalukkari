if(!window.console){ window.console = {log: function(){} }; }
console.log("\
	   _ _ _        _             _       _      _             _ _       \n\
__   _(_|_) | _____(_)_ __   ___ (_) __ _| |_   (_) __ _ _ __ (_) |_ ___ \n\
\\ \\ / / | | |/ / __| | '_ \\ / _ \\| |/ _` | __|  | |/ _` | '_ \\| | __/ _ \\\n\
 \\ V /| | |    \\__ \\ | |_) | (_) | | (_| | |_   | | (_| | | | | | ||  __/\n\
  \\_/ |_|_|_|\\_\\___/_| .__/ \\___// |\\__,_|\\__|  |_|\\__, |_| |_|_|\\__\\___|\n\
					 |_|       |__/                |___/                 ")

var app = angular.module("leffalukkari", ["ngSanitize", "duScroll"])

app.value('duScrollGreedy', true)

app.controller("FilmListCtrl", function($scope, $http, $filter, $timeout) {
	$scope.now = new Date()

	$http.get("data/config.json")
	.then(function(result) {
		$scope.config = result.data
		return $http.get("data/cine.json")
	})
	.then(function(result) {
		var screenings = result.data
		var config = $scope.config

		// ultimate nuggetrium data format for easy viewing
		var data = {"days": {}}
		var theaterObject = {}
		angular.forEach(config.theaters, function(theater, i) {
			theaterObject[theater] = {
				"label": theater,
				"order": i,
				"screenings": []
			}
		})
		var timeslotsObject = {}
		angular.forEach(config.timeslots, function(timeslot, i) {
			timeslotsObject[timeslot] = {
				"label": timeslot,
				"time": (timeslot < 10 ? " " : "") + timeslot + ":00",
				"count": 0,
				"theaters": angular.copy(theaterObject)
			}
		})
		var dayObject = {
			"timeslots": { } //angular.copy(timeslotsObject)
		}

		// let's poop all the screenings to their proper boxes
		angular.forEach(screenings, function(screening) {
			var datetime = new Date(screening.date + "T" + screening.time + "+03:00")

			// TODO: this maybe in screenings.json
			screening.datetime = datetime.toISOString()

			screening.dateId   = getDateId(datetime)
			screening.timeslot = getTimeslot(screening.time)

			var timeslotdatetime = new Date(datetime)
			timeslotdatetime.setHours(screening.timeslot)
			timeslotdatetime.setMinutes(0)
			screening.timeslotdiff = (datetime-timeslotdatetime)/1000/60 // FUCKYEAH

			if (! (screening.dateId in data.days)) {
				data.days[screening.dateId] = angular.copy(dayObject)
				data.days[screening.dateId].id    = screening.dateId
				data.days[screening.dateId].date  = screening.date
			}
			if (! (screening.timeslot in data.days[screening.dateId].timeslots)) {
				data.days[screening.dateId].timeslots[screening.timeslot] 
					= angular.copy(timeslotsObject[screening.timeslot])
			}

			if (config.theaters.indexOf(screening.theater) < 0)
				screening.special = true

			data.days[screening.dateId]
				.timeslots[screening.timeslot]
				.theaters[screening.special ? config.theaters[config.theaters.length-1] : screening.theater]
				.screenings.push(screening)
			data.days[screening.dateId]
				.timeslots[screening.timeslot]
				.count++
		})

		// console.log($scope, data)
		DATA = data
		$scope.data = data
		$scope.screenings = screenings
		$scope.theaters = config.theaters
		// scope is at: angular.element($("[ng-controller]")).scope()
	})

	// BEHAVIOUR FUNCTIONS

	$scope.showKlik = function(screening) {
		console.log(screening)
		screening.selected = !screening.selected
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

	function getDateId(d) {
		return $filter('date')(d, 'EEE-dd')
	}

	function containsDate(date, days) {
		var today = $filter('date')(date, 'yyyy-MM-dd')
		for (d in days) {
			// console.log(today, "vs", days[d].date)
			if (today == days[d].date) return true
		}
		return false
	}

	function getTimeslot(t) {
		var timeslots = $scope.config.timeslots
		// if t < 1st timeslot, ALL HELL BREAKS LOOSE
		var h = parseInt(t.substring(0, 2), 10)
		for (var i = 0; i < timeslots.length; i++)
			if (i == timeslots.length-1 || h >= timeslots[i] && h < timeslots[i+1])
				return timeslots[i]
	}
})

app.directive("screening", function() {
	return {
		templateUrl: "templates/screening.html"
	}
})

// https://codeforgeek.com/2014/12/highlight-search-result-angular-filter/
app.filter('highlight', function() {
	return function(text, phrase) {
		if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'), '<b class="highlight">$1</b>')

		return text
	}
})
