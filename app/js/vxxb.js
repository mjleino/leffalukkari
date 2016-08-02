"use strict";

console.log("\
       _ _ _        _             _       _      _             _ _       \n\
__   _(_|_) | _____(_)_ __   ___ (_) __ _| |_   (_) __ _ _ __ (_) |_ ___ \n\
\\ \\ / / | | |/ / __| | '_ \\ / _ \\| |/ _` | __|  | |/ _` | '_ \\| | __/ _ \\\n\
 \\ V /| | |   <\\__ \\ | |_) | (_) | | (_| | |_   | | (_| | | | | | ||  __/\n\
  \\_/ |_|_|_|\\_\\___/_| .__/ \\___// |\\__,_|\\__|  |_|\\__, |_| |_|_|\\__\\___|\n\
                     |_|       |__/                |___/                 ")

// FIREBASE INIT
var config = {
	apiKey: "AIzaSyANhCceiEJfJAVliYu1fv_s7X52zE2OGoM",
	authDomain: "leffalukkari.firebaseapp.com",
	databaseURL: "https://leffalukkari.firebaseio.com",
	storageBucket: "leffalukkari.appspot.com",
}
firebase.initializeApp(config)

var app = angular.module("appLeffalukkari", ["ngSanitize", "duScroll", "ngStorage"])

// app.config(['$compileProvider', function ($compileProvider) {
// 	$compileProvider.debugInfoEnabled(false)
// }])

app.value('duScrollOffset', 44)

app.controller("FilmListController", function($scope, $http, $filter, $timeout, $localStorage, $document, $locale) {
	$scope.search = { } // https://github.com/oblador/angular-scroll/issues/43
	$scope.now = new Date()
	$scope.user = null
	$scope.friends = { }

	$scope.$storage = $localStorage.$default({
		2016: {
			selected: { }
		}
	})[2016]

	// FETCH & PROCESS
	$http.get("data/cinedata.json")
	.then(function(result) {
		$scope.data = result.data
		// $scope.locale = document.documentElement.lang
		$scope.locale = $locale.id.substring(0,2)
		$scope.i18n = $scope.data.i18n[$scope.locale]
		if ($locale != "fi-fi") document.querySelector("#viiksipojat > span").textContent = $scope.i18n.viiksipojat

		$scope.data.screeningsById = { }
		$scope.data.screenings.forEach(function(screening) {
			if (screening.id in $scope.data.screeningsById)
				console.log("DUPLICATE SCREENING ID", screening.id)
			$scope.data.screeningsById[screening.id] = screening
		})

		console.log("LOADING DONE", $scope.data)
		window.DATA = $scope.data // DEBUGS
		window.$scope = $scope
	})

	// observe final tbody so we know when table has loaded
	$scope.$watch(
		function () {
			return document.getElementById('su-30')
		}, function(value, old) {
			if (! value) return
			if (! containsDate($scope.now, $scope.data.days)) return

			var today = getDateId($scope.now)

			// console.log("YO!! scrolling in today", today)
			$scope.scrollTo(today)
		}
	)

	// BEHAVIOUR FUNCTIONS

	// https://github.com/angular/angular.js/issues/4608
	$scope.scrollTo = function(hash, offset) {
		$timeout(function () {
			var target = document.getElementById(hash)
			$document.scrollToElement(target, offset)
		})
	}

	$scope.showKlik = function(screening) {
		console.log(screening)

		if (screening.id in $scope.$storage.selected)
			delete $scope.$storage.selected[screening.id]
		else $scope.$storage.selected[screening.id] = Date.now()

		firebaseMerge()

		ga('send', 'event', $scope.$storage.selected[screening.id] ? 'select' : 'unselect', screening.id)
	}

	$scope.numberKlik = function(screening) {
		$scope.scrollTarget = $filter('nextscreeningid')(screening)
	}

	$scope.help = function(first) {
		$scope.search.help = !!first || ! $scope.search.help
		$scope.$storage.helpShown = true
		if (! first) ga('send', 'event', $scope.search.help ? 'click' : 'unclick', 'help')
	}

	$scope.myFestival = function() {
		$scope.search.myfestival = ! $scope.search.myfestival
		ga('send', 'event', $scope.search.myfestival ? 'click' : 'unclick', 'myfestival')
	}

	// filter function checking if screening is selected or fb-shared
	$scope.myFestivalCheck = function(screeningOrId, index, array) {
		if (! $scope.search.myfestival) {
			delete $scope.selectedCopy
			return true
		}
		if (! screeningOrId) return false

		var id = angular.isObject(screeningOrId) ? screeningOrId.id : screeningOrId

		// make a copy so films won't disappera when unclicked in my festival view
		if (! $scope.selectedCopy) {
			$scope.selectedCopy = angular.copy($scope.$storage.selected)
		}

		return $scope.selectedCopy[id] || $scope.fbshare[id]
			|| $scope.siblingIsSelected($scope.data.screeningsById[id], $scope.selectedCopy)
	}

	// filter function checking if search matches screening
	$scope.searchCheck = function(screeningOrId, index, array) {
		if (! $scope.search.text) {
			return true
		}
		if (! screeningOrId) return false

		var screening = angular.isObject(screeningOrId) ? screeningOrId : $scope.data.screeningsById[screeningOrId]
		var searchers = $scope.search.text.toLowerCase().split(" ")
		var searchee  = screening.title.toLowerCase()

		for (var i=0; i<searchers.length; i++)
			if (searchee.indexOf(searchers[i]) < 0) return false // AND

		return true
	}

	// check if other screening(s) of this movie are selected
	$scope.siblingIsSelected = function(screening, selectedStorage) {
		var titleId = screening.id.substring(0, screening.id.length-1)
		var numberTotal = screening.number.split("/") // is strings, all good
		var me = numberTotal[0], total = numberTotal[1]

		for (var n = 1; n <= total; n++) {
			if (n != me && (selectedStorage || $scope.$storage.selected)[titleId + n]) return true
		}

		return false

		// WHY NO WORK HUH ?
		// while (next = $scope.data.screeningsById[ $filter('nextscreeningid')(next) ] != screening) {
		// 	if ($scope.$storage.selected[next]) return true
		// }
		// return false
	}

	// HELPER FUNCTIONS

	function getScreeningId(screening) {
		return [screening.url, screening.number.split("/")[0]].join("-")
	}

	function getDateId(d) {
		return $filter('date')(d, 'EEE-dd')
	}

	function containsDate(date, days) {
		// NOTE: returns date according to local timezone
		var today = $filter('date')(date, 'yyyy-MM-dd')
		for (var d in days) {
			// console.log(today, "vs", days[d].date)
			if (today == days[d].date) return true
		}
		return false
	}

	// FACEBOOK STUFF

	// TODO ! !
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
			description: 	titles.join(", "),
			href: 			location.href.split("#")[0] + '#share=' + selected.join(",")
		}, function(response) {
			// console.log("FB", response)
		})
	}

	$scope.fbLogin = function() {
		if ($scope.user)
			$scope.firebaseSignOut()
		else
			$scope.firebaseSignIn()
	}

	// check if we arrived at a facebook share hash, init $scope.fbshare
	$scope.fbShareCheck = function() {
		$scope.fbshare = { }

		if (location.hash.search(/^#share=/) < 0) return
		$scope.search.fbshare = true
		
		var ids = location.hash.split("=")[1].split(",")
		ids.forEach(function(id) {
			$scope.fbshare[id] = true
		})

		// location.hash = "#share" // META
		// $scope.myFestival() // IGNITE
		$scope.help() // SHARING IS CARING
	}

	function fbStatusChangeCallback(response) {
		console.log('fbStatusChangeCallback', response)

		if (response.status === 'connected') {
			fbSyncFriends()
		}
	}

	function fbCheckLoginState() {
		FB.getLoginStatus(fbStatusChangeCallback)
	}

	function fbSyncFriends() {
		if (! $scope.user) {
			console.log("GOT FRIENDS; NO FIREBASE LOGIN")
			return
		}

		FB.api('/me/friends', function(response) {
			console.log('fbSyncFriends', response)
			var friendsRef = firebaseUserRef().child("friends")
			response.data.forEach(function(friend) {
				friendsRef.child(friend.id).set(friend.name)
			})
		})
	}

	FB.init({
		appId      : '1207449112619346',
		cookie     : true,  // enable cookies to allow the server to access the session
		xfbml      : true,  // parse social plugins on this page
		version    : 'v2.7' // use graph api version 2.5
	})

	// FB.getLoginStatus(fbStatusChangeCallback)
	// FB.Event.subscribe('auth.authResponseChange', fbStatusChangeCallback)

	// FIREBASE STUFF

	var provider = new firebase.auth.FacebookAuthProvider()
	provider.addScope('user_friends')
	// TODO: PUBLISH

	function firebaseUserRef() {
		if (! $scope.user) return
		// return firebase.database().ref('users/' + $scope.user.uid)
		// NOTE: WE USE FACEBOOK ID
		// TODO: when would there be more than one providerData
		return firebase.database().ref('users/' + $scope.user.providerData[0].uid)
	}

	$scope.firebaseSignIn = function() {
		firebase.auth().signInWithPopup(provider).then(function(result) {
			// This gives you a Facebook Access Token. You can use it to access the Facebook API.
			$scope.accessToken = result.credential.accessToken
		}).catch(function(error) {
			console.log("LOGIN ERROR", error)
		})
	}

	$scope.firebaseSignOut = function() {
		firebase.auth().signOut().then(function() {
		}, function(error) {
			console.log("LOGOUT ERROR", error)
		})
	}

	firebase.auth().onAuthStateChanged(function(user) {
		console.log("FIREBASE", user ? "LOGIN" : "LOGOUT", user)

		$timeout(function() {
			$scope.user = user
			firebaseListen()
			FB.getLoginStatus(fbStatusChangeCallback)
		})
	})

	function firebaseMerge(selected) {
		console.log("firebaseMerge", selected && selected.val())
		if (! $scope.user) return

		// copy firebase --> localStorage ONLY if localStorage is { }
		if (selected && selected.val() && Object.keys($scope.$storage.selected).length == 0)
			$timeout(function() {
				$scope.$storage.selected = selected.val()
			})
		// otherwise, overwrite localStorage --> firebase
		else {
			firebaseUserRef().child("/selected").set($scope.$storage.selected)
		}
	}

	function firebaseMergeFriend(selected) {
		console.log("firebaseMergeFriend", selected.val())
		$timeout(function() {
			$scope.friends[selected.key] = selected.val()
		})
	}

	function firebaseListen() {
		if (! $scope.user) {
			$scope.friends = { }
			return
		}

		// TODO: DOESN'T WORK ON FIRST LOGIN ? ?
		var userRef = firebaseUserRef()

		// TODO: only do this on facebook login; not every auth state change
		userRef.child("name").set($scope.user.displayName)
		userRef.child("email").set($scope.user.email)
		userRef.child("photoURL").set($scope.user.photoURL)

		userRef.child("selected").on('value', function(data) {
			firebaseMerge(data)
		})

		userRef.child("friends").on('value', function(data) {
			var friends = data.val()
			for (var id in friends) {
				firebase.database().ref('users/' + id).on('value', firebaseMergeFriend)
			}
		})
	}


	// INIT FB SHARE & HELP
	$scope.fbShareCheck()
	if (! $scope.$storage.helpShown) $scope.help()
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
		if (! phrase) return text

		var phrases = phrase.split(" ").join("|") // OR
		text = text.replace(new RegExp('('+phrases+')', 'gi'), '<mark>$1</mark>')

		return text
	}
})

app.filter('count', function() {
	return function(obj) {
		if (angular.isObject(obj)) return Object.keys(obj).length
		return obj.length
	}
})

// merge timeslot.theaters.screening-ids into [ ids ]
app.filter('timeslotnugger', function() {
	return function(timeslot) {
		var ids = [ ]
		angular.forEach(timeslot.theaters, function(theater) {
			ids = ids.concat(theater)
		})
		return ids
	}
})

// deep merge all arrays in object into 1-level array
app.filter('digger', function() {
	function deepshallow(obj) {
		if (obj instanceof Array) return obj
		if (! (obj instanceof Object) ) return undefined

		var cat = []
		for (var o in obj) {
			var d = deepshallow(obj[o])
			if (d) cat = cat.concat(d)
		}

		return cat
	}
	return deepshallow
})

// fetch next screening id: 1/3 -> 2/3 -> 3/3 -> 1/3 -> …
app.filter('nextscreeningid', function() {
	return function(screening) {
		var titleId = screening.id.substring(0, screening.id.length-1)
		var numberTotal = screening.number.split("/")
		var next = numberTotal[0] % numberTotal[1] + 1
		return titleId + next
	}
})

// starttime + duration -> datetime
app.filter('endtime', function() {
	return function(screening) {
		var dt = new Date(screening.datetime)
		dt.setMinutes(dt.getMinutes() + screening.duration)
		return dt.toISOString()
	}
})
