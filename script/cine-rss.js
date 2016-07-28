var fs = require('fs')
var json2xml = require('json2xml')
var child = require('child_process')

// GET TSV FROM GOOGLE
var cmd = './cine-master.sh "https://docs.google.com/spreadsheets/d/1isVNxu1X_M_g-QaO9qdDVmT0vb5Qll7Dp6OF0PmEktg/export?gid=128057870&format=tsv" cine-rss.tsv cine-rss.json'

child.execFileSync('./cine-master.sh', [
		"https://docs.google.com/spreadsheets/d/1isVNxu1X_M_g-QaO9qdDVmT0vb5Qll7Dp6OF0PmEktg/export?gid=128057870&format=tsv",
		"cine-rss.tsv",
		"cine-rss.json"
	]
)

var HEAD = '<?xml version="1.0" encoding="UTF-8"?> \
<rss version="2.0"> \
<channel> \
 <title>Espoo Ciné 2016</title> \
 <description>Espoo Cinén ohjelmisto</description> \
 <link>http://www.espoocine.fi/2016/fi/index</link> \
 <pubDate>Tue, 26 Jul 2016 13:34:03 +0300</pubDate> \
 '
 var FOOT = '</channel></rss>'

fs.readFile('cine-rss.json', {encoding: 'utf-8'}, function(err, data) {
	if (err) {
		console.log(err)
		return
	}

	var json = JSON.parse(data)
	var items = []

	json.forEach(function(item) {
		items.push({
			item: item
		})
	})

	var xml = json2xml(items)
	console.log(HEAD, xml, FOOT)
})
