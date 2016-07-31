#!/usr/bin/env node

// USAGE: node $0 [-r]
//	-r recursively fetch film pages

const request = require("request");
const cheerio = require("cheerio");

const RECURSE = process.argv[2] == "-r"

// COOKIES
var jar = request.jar();
var req = request.defaults({jar: jar});
var cookie = request.cookie('AdminLogin=JUST COPY YOUR LOGIN COOKIE HERE ! !');
jar.setCookie(cookie, "http://sitedesk.espoocine.fi");

function fetch(url, callback) {
	req(url, function (error, response, html) {
		if (error) {
			console.log(error)
			return
		}

		callback(cheerio.load(html))
	})	
}

String.prototype.lolleroids = function(lols) {
	var to = this.toString()
	lols.forEach(function(lol) {
		var re = new RegExp(", " + lol + "$")
		if (re.test(to)) to = to.replace(re, "").replace(/^/, lol + " ")
	})
	return to
}

if (! RECURSE) console.log(['id', 'title', 'img', 'url'].join("\t"))

fetch("http://sitedesk.espoocine.fi/Go=Page-List?PID=1970", function($) {
	// HELLO LOL SITEDESK HAS table > thead > tbody
	$('table.List tbody > tr').each(function(n, tr) {
		if (n == 0) return // SKIP HEADER

		let $tr = $(tr)
		let $a = $tr.find("a[href^='Go=Page-Preview']")

		let id = $tr.find(".ID").text()
		let name = $tr.find("span.Disabled").text().lolleroids(["The", "A", "An", "La", "Le"])
		let img = $tr.find("img[rel]").attr('src')
		let slug = ($a.find("span").attr('title') || $a.text()).replace("ohjelmisto/elokuvat/", "")

		if (RECURSE) {
			// fetch($(a).attr('href'), fetchoroids)
			fetch('http://www.espoocine.fi/2016/fi/ohjelmisto/elokuvat/' + slug, fetchoroids)
		} else {
			console.log([
				id,
				name,
				img,
				slug
			].join('\t'))
		}
	})
})

function fetchoroids($) {
	// console.log($('#MainContent').html())
	var page = $('body').data('pageaddress').replace("ohjelmisto/elokuvat/", "")
	var h1 = $('h1').text()
	var imgs = $('.MovieImages > img')
	console.log([
		page,
		imgs.first().attr('src')
	].join('\t'))
}
