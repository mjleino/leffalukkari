#!/bin/bash
# BASH ❤︎ ALWAYS
# receive your tab separated master movie sheet

# USAGE: $0 [google-sheet cine.tsv cine.json]

MASTER="https://docs.google.com/spreadsheets/d/19CoUKRDymyNCGWhix7X2lf1VGxb_KCA5Pf_NlGg0ZJE/export?format=tsv"
IN=${1:-"https://docs.google.com/spreadsheets/d/1isVNxu1X_M_g-QaO9qdDVmT0vb5Qll7Dp6OF0PmEktg/export?gid=1214127952&format=tsv"}
TSV=${2:-cine.tsv}
JSON=${3:-cine.json}


curl -# "$IN" \
| grep -ve '^#VALUE' | (read -r; printf "%s\n" "$REPLY"; sort) > "$TSV"
# http://jeffgraves.me/2013/12/11/skip-header-with-bash-sort/

csvtojson --delimiter=$'\t' "$TSV" \
| uglifyjs --expr --beautify quote-keys=true > "$JSON"
