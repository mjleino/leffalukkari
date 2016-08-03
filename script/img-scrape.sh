# FETCH UR IMAGES OK
# usage: $0 < img-scrape.tsv

while read slug img crap; do
	IN="http://www.espoocine.fi/2016/fi/$img"
	OUT="$img"
	if [ "$OUT" ] && [ ! -f "$OUT" ]; then
		mkdir -p ${OUT%/*}
		echo $IN; curl -s -o "$OUT" "$IN"
	fi
done
