var app = angular.module("leffalukkari", [])

app.controller("FilmListCtrl", function($scope, $http) {
	var config
	$http.get("/app-data/config.json")
	.then(function(result) {
		config = result.data
		return $http.get("/app-data/screenings.json")
	})
	.then(function(result) {
		var screenings = result.data
		
		// ultimate nuggetrium data format for easy viewing
		var data = {"days": {}}
		var theaterObject = {}
		angular.forEach(config.theaters, function(theater, i){
			theaterObject[theater] = {
				"label": theater,
				"order": i,
				"screenings": []
			}
		})
		var timeslotsObject = {}
		angular.forEach(config.timeslots, function(timeslot) {
			timeslotsObject[timeslot] = {
				"label": timeslot,
				"theaters": angular.copy(theaterObject)
			}
		})
		var dayObject = {
			"timeslots": angular.copy(timeslotsObject)
		}

		// let's poop all the screenings to their proper boxes
		angular.forEach(screenings, function(screening) {
			var dateId = getDateId(new Date(screening.date))
			if (! (dateId in data.days)) {
				data.days[dateId] = angular.copy(dayObject)
				data.days[dateId].label = getDateLabel(new Date(screening.date))
				data.days[dateId].id    = dateId
				data.days[dateId].order = screening.date
			}

			var timeslot = getTimeslot(screening.time)
			data.days[dateId]
			    .timeslots[timeslot]
			    .theaters[screening.theater]
			    .screenings.push(screening)
		})

		console.log(data)
		$scope.data = data
		$scope.theaters = config.theaters
	})

	$scope.fuckers = {
		"2Matt": {type: "BOOGER", fucks: 12},
		"1Ben": {type: "TITFACE", fucks: 2},
		"3Dick": {type:"BOOZZZE", fucks: 555}
	}

	// HELPER FUNCTIONS ->
	function getDateId(d) {
		var weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
		return weekdays[d.getDay()] + "-" + d.getDate()
	}
	function getDateLabel(d) {
		var weekdays = ["Su", "Ma", "Tu", "Ke", "To", "Pe", "La"]
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

app.filter("orderObjectBy", function() { /* source: http://justinklemm.com/angularjs-filter-ordering-objects-ngrepeat/ */
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