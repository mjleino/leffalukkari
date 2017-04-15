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
	projectId: "leffalukkari",
	storageBucket: "leffalukkari.appspot.com",
	messagingSenderId: "97795109066"
}
firebase.initializeApp(config)
var firebaseUserPath = "espoocine/2017/users/"

var app = angular.module("appLeffalukkari", ["ngSanitize", "duScroll", "ngStorage"])

// app.config(['$compileProvider', function ($compileProvider) {
// 	$compileProvider.debugInfoEnabled(false)
// }])

app.value('duScrollOffset', 82)

app.controller("LeffalukkariController", function($scope, $http, $filter, $timeout, $localStorage, $document, $locale) {
	$scope.search = { } // https://github.com/oblador/angular-scroll/issues/43
	$scope.now = new Date()
	$scope.today = getDateId($scope.now)
	$scope.user = null
	$scope.friends = { }
	$scope.sharecount = 0

	$scope.$storage = $localStorage.$default({
		2017: {
			selected: { }
		}
	})[2017]

	// FETCH & PROCESS
	$http.get("data/cinedata.json")
	.then(function(result) {
		$scope.data = result.data
		// $scope.locale = document.documentElement.lang
		$scope.locale = $locale.id.substring(0,2)
		$scope.i18n = $scope.data.i18n[$scope.locale]
		if ($locale != "fi-fi") document.querySelector("#viiksipojat > span").textContent = $scope.i18n.viiksipojat

		for (var id in $scope.$storage.selected) {
			if (! $scope.data.screenings[id]) {
				console.log("STORAGE SCREENING ID MISSING", id)
			}
		}

		console.log("LOADING DONE", $scope.data)
		window.DATA = $scope.data // DEBUGS
		window.$scope = $scope
		window.$filter = $filter
	})

	// observe final tbody so we know when table has loaded
	$scope.$watch(
		function () {
			return document.getElementById('su-28')
		}, function(value, old) {
			if (! value) return
			if (! containsDate($scope.now, $scope.data.days)) return

			// console.log("YO!! scrolling in today", $scope.today)
			$scope.scrollTo($scope.today)
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

	$scope.friendKlik = function(friend) {
		if ($scope.search.myfestival) friend.myfestival = ! friend.myfestival
		else friend.hidden = ! friend.hidden
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

		var userSelected = $scope.selectedCopy[id] || $scope.siblingIsSelected($scope.data.screenings[id], $scope.selectedCopy)

		var friendSelected = 0
		angular.forEach($scope.friends, function(friend) {
			if (friend && friend.myfestival && friend.selected && friend.selected[id])
				friendSelected++
		})

		return userSelected || friendSelected
	}

	// filter function checking if search matches screening
	$scope.searchCheck = function(screeningOrId, index, array) {
		if (! $scope.search.text) {
			return true
		}
		if (! screeningOrId) return false

		var screening = angular.isObject(screeningOrId) ? screeningOrId : $scope.data.screenings[screeningOrId]
		var searchers = $scope.search.text.toLowerCase().split(" ")
		var searchee  = screening.title.toLowerCase()

		for (var i=0; i<searchers.length; i++)
			if (searchee.indexOf(searchers[i]) < 0) return false // AND

		return true
	}

	// check if other screening(s) of this movie are selected
	$scope.siblingIsSelected = function(screening, selectedStorage) {
		function next(screeningId) {
			return $filter('nextscreeningid')($scope.data.screenings[screeningId])
		}

		var id = screening.id
		while ((id = next(id)) && (id != screening.id)) {
			if ((selectedStorage || $scope.$storage.selected)[id]) return true
		}

		return false
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

	$scope.fbShare = function($event) {
		console.log("FBSHARE", $scope.sharecount, $scope.$storage.selected)
		ga('send', 'event', 'click', 'fbshare')

		// bail if firefox private browsing
		if (! window.FB) return
		else $event.preventDefault()

		var userRef = firebaseUserRef()
		var shareRef = userRef.child('share/' + ++$scope.sharecount)
		shareRef.set($scope.$storage.selected)

		var keys = Object.keys($scope.$storage.selected)
		var titles = keys.filter(function(id) {
			return $scope.data.screenings[id]
		}).map(function(id) {
			return $scope.data.screenings[id].title
		})

		FB.ui({
			method: 	'share',
			description: titles.join(", "),
			picture: 	'http://www.espoocine.fi/2016/fi/Image/8250/paakuva.jpg',
			href: 		"http://www.espoocine.fi/2017/fi/ohjelmisto/kalenteri" + "#/share/" + userRef.key + "/" + $scope.sharecount
		}, function(response) {
			userRef.child('sharecount').set($scope.sharecount)
			console.log("SHARE DONE?", response)
		})
	}

	$scope.fbLogin = function() {
		if ($scope.user) {
			ga('send', 'event', 'click', 'firebaseSignOut')
			$scope.firebaseSignOut()
		} else {
			ga('send', 'event', 'click', 'firebaseSignIn')
			$scope.firebaseSignIn()
		}
	}

	// check if we arrived at a facebook share hash, sync that friend
	$scope.fbShareCheck = function() {
		var split = location.hash.split("/")
		if (split[1] != "share") return

		var id = split[2]
		var share = split[3]

		// TEMPORARY FRIEND
		firebase.database().ref(firebaseUserPath + id).once('value').then(function(data) {
			console.log("GOT FB SHARE")
			firebaseMergeShare(data, share)
			$scope.search.fbshare = data.key
			$scope.help(true) // SHARING IS CARING
		})

		// $scope.myFestival() // FESTIV?
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
			var userRef = firebaseUserRef()
			if (! response.data) return

			response.data.forEach(function(friend) {
				userRef.child('friends').child(friend.id).set(friend.name)
				// ALSO NOTIFY MY FRIENDS. SPAM ALERT.
				firebase.database().ref(firebaseUserPath + friend.id + '/friends/' + userRef.key).set($scope.user.displayName)
			})
		})
	}

	window.FB && FB.init({
		appId      : '1207489822615275',
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
		// return firebase.database().ref(firebaseUserPath + $scope.user.uid)
		// NOTE: WE USE FACEBOOK ID
		// TODO: when would there be more than one providerData
		return firebase.database().ref(firebaseUserPath + $scope.user.providerData[0].uid)
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
		// SHOULD WE REMOVE FRIENDS?
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
			window.FB && FB.getLoginStatus(fbStatusChangeCallback)
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

	function firebaseMergeFriend(friend) {
		// console.log("firebaseMergeFriend", friend.val())
		$timeout(function() {
			$scope.friends[friend.key] = friend.val()
		})
	}

	function firebaseMergeShare(friend, share) {
		console.log("firebaseMergeShare", friend.val())
		$timeout(function() {
			$scope.friends[friend.key] = friend.val()
			$scope.friends[friend.key].myfestival = true
			// LOL THIS HACK. temporarily set share as this friendos selected screenings.
			if (share) $scope.friends[friend.key].selected = $scope.friends[friend.key].share[share]
			console.log("HACK", share, $scope.friends[friend.key].selected)
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

		userRef.child("sharecount").on('value', function(data) {
			$scope.sharecount = data.val()
		})

		userRef.child("selected").on('value', function(data) {
			firebaseMerge(data)
		})

		userRef.child("friends").on('child_added', function(data) {
			console.log("FRIEND_ADDED", data.key, data.val())
			firebase.database().ref(firebaseUserPath + data.key).on('value', firebaseMergeFriend)
		})

		userRef.child("friends").on('child_removed', function(data) {
			console.log("FRIEND_REMOVED", data.key, data.val())
			firebase.database().ref(firebaseUserPath + data.key).off()
			$timeout(function() {
				$scope.friends[data.key] = null
			})
		})
	}


	// INIT FB SHARE & HELP
	$scope.fbShareCheck()
	if (! $scope.$storage.helpShown) $scope.help(true)
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

// count arrray or object
app.filter('count', function() {
	return function(obj) {
		if (! obj) return undefined
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
		if (! screening) return undefined
		var numberTotal = screening.number.split("/")
		var next = numberTotal[0] % numberTotal[1] + 1
		return screening.url + "-" + next
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
