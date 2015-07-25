if(!window.console){ window.console = {log: function(){} }; }
console.log("\
	   _ _ _        _             _       _      _             _ _       \n\
__   _(_|_) | _____(_)_ __   ___ (_) __ _| |_   (_) __ _ _ __ (_) |_ ___ \n\
\\ \\ / / | | |/ / __| | '_ \\ / _ \\| |/ _` | __|  | |/ _` | '_ \\| | __/ _ \\\n\
 \\ V /| | |   <\\__ \\ | |_) | (_) | | (_| | |_   | | (_| | | | | | ||  __/\n\
  \\_/ |_|_|_|\\_\\___/_| .__/ \\___// |\\__,_|\\__|  |_|\\__, |_| |_|_|\\__\\___|\n\
					 |_|       |__/                |___/                 ")

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
				"time": (timeslot < 10 ? " " : "") + timeslot + ":00",
				"count": 0,
				"theaters": angular.copy(theaterObject)
			}
		})
		var dayObject = {
			"timeslots": angular.copy(timeslotsObject)
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
				data.days[screening.dateId].label = getDateLabel(datetime)
				data.days[screening.dateId].id    = screening.dateId
				data.days[screening.dateId].date  = screening.date
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

	// BEHAVIOUR FUNCTIONS
	$scope.showKlik = function(screening) {
		console.log(screening)
		screening.selected = !screening.selected
	}

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

// https://codeforgeek.com/2014/12/highlight-search-result-angular-filter/
app.filter('highlight', function() {
	return function(text, phrase) {
		if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'), '<b class="highlight">$1</b>')

		return text
	}
})
