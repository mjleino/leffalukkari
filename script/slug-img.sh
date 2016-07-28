OUT=slug-img.tsv
rm $OUT

while read slug; do
	echo -ne "$slug\t" >> $OUT
	# agrep -1 --best-match $slug ls.list | head -1 >> $OUT
	# slug1=$(echo $slug | cut -d - -f 1)
	(fzf -f $slug < ls.list ; echo) | head -1 >> $OUT
done < slugs.list
