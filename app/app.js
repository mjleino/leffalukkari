var app = angular.module("leffalukkari", ["ngSanitize"])

app.controller("FilmListCtrl", function($scope, $http) {
	var config

	$http.get("/app-data/config.json")
	.then(function(result) {
		config = result.data
		return $http.get("/app-data/cine.json")
	})
	.then(function(result) {
		var screenings = result.data

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
				"order": i,
				"count": 0,
				"theaters": angular.copy(theaterObject)
			}
		})
		var dayObject = {
			"timeslots": angular.copy(timeslotsObject)
		}

		// let's poop all the screenings to their proper boxes
		angular.forEach(screenings, function(screening) {
			var date = new Date(screening.date + "T" + screening.time)

			// TODO: this maybe in screenings.json
			screening.datetime = date.toISOString()

			screening.dateId   = getDateId(date)
			screening.timeslot = getTimeslot(screening.time)

			if (! (screening.dateId in data.days)) {
				data.days[screening.dateId] = angular.copy(dayObject)
				data.days[screening.dateId].label = getDateLabel(date)
				data.days[screening.dateId].id    = screening.dateId
				data.days[screening.dateId].order = screening.date
			}

			var theaterslot = screening.theater
			if (config.theaters.indexOf(screening.theater) < 0) {
				theaterslot = config.theaters[config.theaters.length-1]
				screening.special = true
			}

			data.days[screening.dateId]
			    .timeslots[screening.timeslot]
			    .theaters[theaterslot]
			    .screenings.push(screening)
			data.days[screening.dateId]
			    .timeslots[screening.timeslot]
			    .count++
		})

		console.log($scope, data)
		$scope.data = data
		$scope.screenings = screenings
		$scope.theaters = config.theaters
		// scope is at: angular.element($("[ng-controller]")).scope()
	})

	// HELPER FUNCTIONS ->
	function getDateId(d) {
		var weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
		return weekdays[d.getDay()] + "-" + d.getDate()
	}
	function getDateLabel(d) {
		var weekdays = ["su", "ma", "ti", "ke", "to", "pe", "la"]
		return weekdays[d.getDay()] + " " + d.getDate() + "." + (d.getMonth()+1) + "."
	}
	function getTimeslot(t) {
		// if t < 1st timeslot, ALL HELL BREAKS LOOSE
		var h = parseInt(t.substring(0, 2), 10)
		for (var i = 0; i < config.timeslots.length; i++)
			if (i == config.timeslots.length-1 || h >= config.timeslots[i] && h < config.timeslots[i+1])
				return config.timeslots[i]
	}
})

app.directive("screening", function() {
	return {
		templateUrl: "templates/screening.html"
	}
})

// http://justinklemm.com/angularjs-filter-ordering-objects-ngrepeat/
app.filter("orderObjectBy", function() {
	return function(items, field, reverse) {
		var filtered = []
		angular.forEach(items, function(item) {
			filtered.push(item)
		})
		filtered.sort(function (a, b) {
			return (a[field] > b[field] ? 1 : -1)
		})
		if(reverse) filtered.reverse()
		return filtered
	}
})

app.filter("hasScreenings", function() {
	return function(timeslots, search) {
		console.log("hasScreenings", timeslots, search)
		var filtered = []
		angular.forEach(timeslots, function(timeslot) {
			filtered.push(timeslot)
		})

		return filtered
	}
})

// https://codeforgeek.com/2014/12/highlight-search-result-angular-filter/
app.filter('highlight', function() {
	return function(text, phrase) {
		if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'), '<b class="highlight">$1</b>')

		return text
	}
})
