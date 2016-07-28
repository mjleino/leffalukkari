# FETCH UR IMAGES OK

for img in $(<img-scrape.list); do
	IN=http://www.espoocine.fi/2015/fi/Image/$img/.jpg
	OUT=$img.jpg
	if [ ! -f $OUT ]; then
		echo -n $IN; curl -# -o $OUT $IN
	fi
done 
