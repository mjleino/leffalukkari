/*
	http://sitedesk.espoocine.fi/Go=Page-List?PID=1970

	disable javascript¹ & refresh page & copy-paste : )

	¹ otherwise, long url slugs disappear

	DONE/TODO
	✓ trim img & url
	✓ move ", The" & ", A" & ", La" in front of title
	✓ don't console.log; copy(SITEDATA) to clipboard
*/

SITEDATA = ['id', 'title', 'img', 'url'].join("\t") + "\n"
trs = document.querySelectorAll(".List > tbody > tr")

String.prototype.lolleroids = function(lols) {
	var to = this.toString()
	lols.forEach(function(lol) {
		var re = new RegExp(", " + lol + "$")
		if (re.test(to)) to = to.replace(re, "").replace(/^/, lol + " ")
	})
	return to
}

for (i=0; i<trs.length; i++) {
  tr = trs[i]
  a = tr.querySelector("a[href^='Go=Page-Preview']")
  SITEDATA += [
    tr.querySelector(".ID").textContent,
    tr.querySelector(".Disabled").textContent.lolleroids(["The", "A", "An", "La", "Le"]),
    tr.querySelector("img[rel]") && tr.querySelector("img[rel]").src.match(/.*\/Image\/(.*)\/.*/)[1],
    (a.querySelector("span") ? a.querySelector("span").title : a.textContent).replace("ohjelmisto/elokuvat/", "")
  ].join("\t")
  SITEDATA += "\n"
}

console.log("COPYING SITEDATA TO SYSTEM CLIPBOARD")
copy(SITEDATA)
