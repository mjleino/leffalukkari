# FETCH UR IMAGES OK
# usage: $0 < sitedesk-scrape.tsv

while IFS=$'\t' read -r pid title img slug; do
	img=Image/$img/$slug.jpg
	IN="http://www.espoocine.fi/2017/fi/$img"
	OUT="$img"
	if [ "$OUT" ] && [ ! -f "$OUT" ]; then
		mkdir -p ${OUT%/*}
		echo $IN; curl -s -o "$OUT" "$IN"
	fi
done
