#!/bin/bash
# BASH ❤︎ ALWAYS
# receive your tab separated master movie sheet

# USAGE: $0 [google-sheet cine.tsv cine.json]

IN=${1:-"https://docs.google.com/spreadsheets/d/11AfzMjZShFqPFzuO5Wye4n_ybwmyf30_iZEThMzDcy0/export?gid=1214127952&format=tsv"}
TSV=${2:-cine.tsv}
JSON=${3:-cine.json}


curl -# "$IN" \
| egrep -v '^(#VALUE|#N/A|\t)' | (read -r; printf "%s\n" "$REPLY"; sort) > "$TSV"
# http://jeffgraves.me/2013/12/11/skip-header-with-bash-sort/

csvtojson --delimiter=$'\t' --quote=\" "$TSV" \
| uglifyjs --expr --beautify "quote-keys=true, quote_style=2" > "$JSON"
