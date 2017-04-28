"use strict";

console.log("\
       _ _ _        _             _       _      _             _ _       \n\
__   _(_|_) | _____(_)_ __   ___ (_) __ _| |_   (_) __ _ _ __ (_) |_ ___ \n\
\\ \\ / / | | |/ / __| | '_ \\ / _ \\| |/ _` | __|  | |/ _` | '_ \\| | __/ _ \\\n\
 \\ V /| | |   <\\__ \\ | |_) | (_) | | (_| | |_   | | (_| | | | | | ||  __/\n\
  \\_/ |_|_|_|\\_\\___/_| .__/ \\___// |\\__,_|\\__|  |_|\\__, |_| |_|_|\\__\\___|\n\
                     |_|       |__/                |___/                 ")

// FIREBASE INIT
var firebaseConfig = {
	apiKey: "AIzaSyBEOPf5wjz_1ZHHXTOaD26jK00eM7NWo7I",
	authDomain: "espoocine2017.firebaseapp.com",
	databaseURL: "https://espoocine2017.firebaseio.com",
	projectId: "espoocine2017",
	storageBucket: "espoocine2017.appspot.com",
	messagingSenderId: "256524825671",
	userPath: "users/",
	facebookPath: "facebook/"
}
firebase.initializeApp(firebaseConfig)

var app = angular.module("appLeffalukkari", ["ngSanitize", "duScroll", "ngStorage"])

// app.config(['$compileProvider', function ($compileProvider) {
// 	$compileProvider.debugInfoEnabled(false)
// }])

app.value('duScrollOffset', 82)

app.controller("LeffalukkariController", function($scope, $http, $filter, $timeout, $localStorage, $document, $locale) {
	$scope.search = { } // https://github.com/oblador/angular-scroll/issues/43
	$scope.help = { }
	$scope.now = new Date()
	$scope.today = getDateId($scope.now)
	$scope.user = null
	$scope.friends = { }
	$scope.sharecount = 0
	$scope.search.friendfestival = 0

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
		else {
			$scope.$storage.selected[screening.id] = Date.now()

			if (! $scope.help.dofbshareShown) $scope.help.dofbshare = true
			$scope.help.dofbshareShown = true
		}

		firebaseMerge()

		ga('send', 'event', $scope.$storage.selected[screening.id] ? 'select' : 'unselect', screening.id)
	}

	$scope.numberKlik = function(screening) {
		$scope.scrollTarget = screening.next
	}

	$scope.friendKlik = function(friend) {
		friend.myfestival = ! friend.myfestival
		$scope.search.friendfestival += friend.myfestival ? 1 : -1
		ga('send', 'event', friend.myfestival ? 'click' : 'unclick', 'friend')
	}

	$scope.helpKlik = function(first) {
		$scope.help.show = !!first || ! $scope.help.show
		$scope.$storage.helpShown = true
		if (! first) ga('send', 'event', $scope.help.show ? 'click' : 'unclick', 'help')
	}

	$scope.myFestival = function() {
		$scope.search.myfestival = ! $scope.search.myfestival
		ga('send', 'event', $scope.search.myfestival ? 'click' : 'unclick', 'myfestival')
	}

	// filter checking if (in myfestival mode) screening or sibling is selected
	$scope.myFestivalCheck = function(screeningOrId, index, array) {
		if (! screeningOrId) return undefined

		if (! $scope.search.myfestival && ! $scope.search.friendfestival) {
			delete $scope.selectedCopy
			return true
		}

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

		return $scope.search.myfestival && userSelected || friendSelected
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
			title:      'Espoo Ciné 2017: Kalenteri',
			picture: 	'http://www.espoocine.fi/2017/fi/Image/8250/paakuva.jpg',
			href: 		"http://www.espoocine.fi/2017/fi/elokuvat/kalenteri" + "#/share/" + userRef.key + "/" + $scope.sharecount
		}, function(response) {
			userRef.child('sharecount').set($scope.sharecount)
			// console.log("SHARE DONE", response)
		})
	}

	// check if we arrived at a facebook share hash, sync that friend
	$scope.fbShareCheck = function() {
		var split = location.hash.split("/")
		if (split[1] != "share") return

		var id = split[2]
		var share = split[3]

		// TEMPORARY FRIEND
		firebase.database().ref(firebaseConfig.userPath + id).once('value').then(function(data) {
			console.info("GOT FB SHARE")
			firebaseMergeShare(data, share)
			$scope.search.fbshare = data.key
			$scope.helpKlik(true) // SHARING IS CARING
		})

		// $scope.myFestival() // FESTIV?
	}

	$scope.fbLogin = function() {
		if ($scope.user) {
			ga('send', 'event', 'click', 'fbLogout')
			// FB.logout()
			firebaseSignOut()
		} else {
			ga('send', 'event', 'click', 'fbLogin')
			FB.login(function(response) {
				// console.log("FB.login", response)
			}, {scope: 'email,user_friends'})
		}
	}

	function isUserEqual(facebookAuthResponse, firebaseUser) {
		if (firebaseUser) {
			var providerData = firebaseUser.providerData
			for (var i = 0; i < providerData.length; i++) {
				if (providerData[i].providerId === firebase.auth.FacebookAuthProvider.PROVIDER_ID &&
					providerData[i].uid === facebookAuthResponse.userID) {
					return true
				}
			}
		}
		return false
	}

	function fbStatusChangeCallback(event) {
		console.log('fbStatusChangeCallback', event)

		if (event.authResponse) {
			// User is signed-in Facebook.
			var unsubscribe = firebase.auth().onAuthStateChanged(function(firebaseUser) {
				unsubscribe() // JUST A SINGLE AUTH STATE CHANGED

				// Check if we are already signed-in Firebase with the correct user.
				if (!isUserEqual(event.authResponse, firebaseUser)) {
					var credential = firebase.auth.FacebookAuthProvider.credential(event.authResponse.accessToken)
					firebaseSignIn(credential)
				} else {
					// User is already signed-in Firebase with the correct user.
					// We don't need to re-auth the Firebase connection.
					// console.log("ALREADY_SIGNED_IN")
				}
			})

			// NOTE: we might not have firebase login here. we double-shoot friend sync. (1)
			fbSyncFriends()
		} else {
			// User is signed-out of Facebook.
			firebaseSignOut()
		}
	}

	function fbSyncFriends() {
		// SORRY SIR. can't have friends if no firebase login.
		if (! $scope.user) return

		FB.api('/me/friends', function(response) {
			console.log('fbSyncFriends', response)
			if (! response.data) {
				console.warn("GET FRIENDS? NO FACEBOOK LOGIN")
				return
			}

			var userRef = firebaseUserRef()
			if (! userRef) {
				console.warn("GOT FRIENDS? NO FIREBASE LOGIN")
				return
			}

			response.data.forEach(function(friend) {
				// map friends' facebookId → firebaseId
				firebase.database().ref(firebaseConfig.facebookPath + friend.id).once('value').then(function(data) {
					var fid = data.val()
					if (! fid) {
						console.warn("FRIEND HAS NEVER LOGGED IN?", friend)
						return
					}

					userRef.child('friends').child(fid).set(friend.name)

					// ALSO NOTIFY MY FRIENDS. SPAM ALERT.
					firebase.database().ref(firebaseConfig.userPath + fid + '/friends/' + userRef.key).set($scope.user && $scope.user.displayName)
				})
			})
		})
	}

	FB.init({
		appId      : '1504498216507859', //2017 [re: 2015]
		// status     : true,  // fetch login status on page load
		cookie     : true,  // enable cookies to allow the server to access the session
		xfbml      : true,  // parse social plugins on this page
		version    : 'v2.7' // use graph api version <2.9 so share picture & description works
	})

	// FB.getLoginStatus(fbStatusChangeCallback)
	FB.Event.subscribe('auth.authResponseChange', fbStatusChangeCallback)

	// FIREBASE STUFF

	function firebaseUserRef() {
		if (! firebase.auth().currentUser) return null
		return firebase.database().ref(firebaseConfig.userPath + firebase.auth().currentUser.uid)
	}

	$scope.firebaseLogin = function() {
		if ($scope.user) {
			ga('send', 'event', 'click', 'firebaseSignOut')
			firebaseSignOut()
		} else {
			ga('send', 'event', 'click', 'firebaseSignIn')
			firebaseSignIn()
		}
	}

	function firebaseSignIn(credential) {
		firebase.auth().signInWithCredential(credential).catch(function(error) {
			console.log("LOGIN ERROR", error)
		})
	}

	function firebaseSignOut() {
		// should we remove ourself from friends' lists?
		firebase.auth().signOut().catch(function(error) {
			console.log("LOGOUT ERROR", error)
		})
	}

	firebase.auth().onAuthStateChanged(function(user) {
		console.log("FIREBASE", user ? "LOGIN" : "LOGOUT", user)

		$scope.user = user
		if (! user) $scope.friends = { }

		// give angular time to breathe
		$timeout(function() { })

		// publish our provider data
		firebaseSync()
		firebaseListen()

		// we have firebase login, let's do facebook 
		if (user) FB.getLoginStatus()
	})

	function firebaseSync() {
		var userRef = firebaseUserRef()
		if (! userRef) return

		for (var i = 0; i < $scope.user.providerData.length; i++) {
			var data = $scope.user.providerData[i]

			// $scope.user.updateProfile({
			// 	displayName: response.name,
			// 	photoURL: "http://graph.facebook.com/" + response.id + "/picture?type=square"
			// })

			// our name might always have changed
			userRef.child("name").set(data.displayName)

			// https://github.com/firebase/firebaseui-web/issues/95
			if (data.providerId == firebase.auth.FacebookAuthProvider.PROVIDER_ID) {
				userRef.child("photoURL").set("http://graph.facebook.com/" + data.uid + "/picture?type=square")
			} else {
				userRef.child("photoURL").set(data.photoURL)
			}

			firebase.database().ref(data.providerId.replace(/\.com$/, "")).child(data.uid).set($scope.user.uid)
		}
	}

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
			firebaseUserRef().child("selected").set($scope.$storage.selected)
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
		var userRef = firebaseUserRef()
		if (! userRef) return

		userRef.child("sharecount").on('value', function(data) {
			$scope.sharecount = data.val()
		})

		userRef.child("selected").on('value', function(data) {
			firebaseMerge(data)
		})

		userRef.child("friends").on('child_added', function(data) {
			console.info("FRIEND_ADDED", data.key, data.val())
			firebase.database().ref(firebaseConfig.userPath + data.key).on('value', firebaseMergeFriend)
		})

		userRef.child("friends").on('child_removed', function(data) {
			console.info("FRIEND_REMOVED", data.key, data.val())
			firebase.database().ref(firebaseConfig.userPath + data.key).off()
			$timeout(function() {
				delete $scope.friends[data.key]
			})
		})
	}


	// INIT FB SHARE & HELP
	$scope.fbShareCheck()
	if (! $scope.$storage.helpShown) $scope.helpKlik(true)
})

// DIRECTIVE & FILTER

app.directive("screening", function() {
	return {
		templateUrl: "templates/screening.html"
	}
})

app.directive("help", function() {
	return {
		templateUrl: "templates/help.html"
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
