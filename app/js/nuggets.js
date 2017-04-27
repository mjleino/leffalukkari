"use strict";

console.log("\
       _ _ _        _             _       _         _       _                                       _             _     _     \n\
__   _(_|_) | _____(_)_ __   ___ (_) __ _| |_    __| | __ _| |_ __ _   _ __  _   _  __ _  __ _  ___| |_ _ __ ___ (_) __| |___ \n\
\\ \\ / / | | |/ / __| | '_ \\ / _ \\| |/ _` | __|  / _` |/ _` | __/ _` | | '_ \\| | | |/ _` |/ _` |/ _ \\ __| '__/ _ \\| |/ _` / __|\n\
 \\ V /| | |   <\\__ \\ | |_) | (_) | | (_| | |_  | (_| | (_| | || (_| | | | | | |_| | (_| | (_| |  __/ |_| | | (_) | | (_| \\__ \\\n\
  \\_/ |_|_|_|\\_\\___/_| .__/ \\___// |\\__,_|\\__|  \\__,_|\\__,_|\\__\\__,_| |_| |_|\\__,_|\\__, |\\__, |\\___|\\__|_|  \\___/|_|\\__,_|___/\n\
                     |_|       |__/                                                |___/ |___/                                ")

var datanuggetrorApp = angular.module("datanuggetror", [])

datanuggetrorApp.controller("DataNuggetController", function($scope, $http) {
	// FETCH SCREENINGS.JSON DATA
	$http.get("data/config.json")
	.then(function(result) {
		console.log("CONFIG", result)
		$scope.config = result.data
		return $http.get("data/i18n.json")
	})
	.then(function(result) {
		console.log("I18N", result)
		$scope.i18n = result.data
		return $http.get("data/cine.json")
	})
	.then(function(result) {
		console.log("SCREENINGS", result)
		$scope.screenings = result.data

		$scope.data = $scope.dataNuggetror($scope.screenings, $scope.config, $scope.i18n)
		window.DATA = $scope.data

		console.log("DATA NUGGETS DONE", $scope.data)
		console.info("try copy(DATA) or JSON.stringify(DATA) ! !")
	})

	// ultimate nuggetrium data format for easy pooping
	// poops into { config, i18n, screenings, days } AND injects screenings with extra data
	$scope.dataNuggetror = function(screenings, config, i18n) {
		var data = {
			"config": config,
			"i18n": i18n,
			"screenings": { },
			"days": { },
			"slugs": { }
		}

		var theaterObject = {}
		angular.forEach(config.theaters, function(theater, i) {
			theaterObject[theater] = [ ]
		})

		var timeslotsObject = {}
		angular.forEach(config.timeslots, function(timeslot, i) {
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
		angular.forEach(screenings, function(screening) {
			var datetime = new Date(screening.date + "T" + screening.time + "+03:00")
			// console.log(screening.title, datetime)

			screening.id       = getScreeningId(screening)
			screening.next     = undefined
			screening.datetime = datetime.toISOString() // could be in data.json
			screening.dateId   = getDateId(datetime)
			screening.timeslot = getTimeslot(screening.time)

			var timeslotdatetime = new Date(datetime)
			timeslotdatetime.setUTCHours(screening.timeslot-3, 0) // HOX -03:00
			screening.timeslotdiff = (datetime-timeslotdatetime)/1000/60

			if (screening.id in data.screenings)
				console.warn("DUPLICATE SCREENING ID", screening.id)

			data.screenings[screening.id] = screening

			var slug = screening.url
			if (! (slug in data.slugs)) {
				data.slugs[slug] = []
			}
			data.slugs[slug].push(screening.id)

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
				.push(screening.id)

			var timeslotduration = screening.timeslotdiff + screening.duration
			if (timeslotduration > data.days[screening.dateId].timeslots[screening.timeslot].duration)
				data.days[screening.dateId].timeslots[screening.timeslot].duration = timeslotduration

			data.days[screening.dateId].timeslots[screening.timeslot].count++
		})

		console.log("ROUND 1 DONE")

		// ROUND 2. process next screening ids'.
		angular.forEach(screenings, function(screening) {
			data.screenings[screening.id].next = nextScreeningId(screening, data.slugs)
		})

		// POST-PROCESS HACKS FOR EMPTY SLOTS
		data.days["su-07"].timeslots[17] = angular.copy(timeslotsObject[17])
		data.days["su-07"].timeslots[17].theaters[config.theaters[0]].push(null)

		return data
	}

	// HELPER FUNCTIONS

	function getMovieSlug(screening) {
		return screening.title.toLowerCase().replace(/[ ,\&\"\']/g, "-")
	}

	function getScreeningId(screening) {
		if (! screening.number) return screening.url
		return [screening.url, screening.number.split("/")[0]].join("-")
	}

	function getDateId(date) {
		var wkds = [ "su", "ma", "ti", "ke", "to", "pe", "la" ]
		return wkds[date.getDay()] + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate()
	}

	function getTimeslot(t, timeslots) {
		var timeslots = $scope.config.timeslots
		// if t < 1st timeslot, ALL HELL BREAKS LOOSE
		var h = parseInt(t.substring(0, 2), 10)
		for (var i = 0; i < timeslots.length; i++)
			if (i == timeslots.length-1 || h >= timeslots[i] && h < timeslots[i+1])
				return timeslots[i]
	}

	function nextScreeningId(screening, slugs) {
		let ids = slugs[screening.url]
		let now = ids.indexOf(screening.id)
		let next = (now + 1) % ids.length
		return ids[next]
	}
})
