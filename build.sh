#!/bin/bash

FILENAME=liveknoxss-extension-`gitver current`.xpi
OUT=/tmp/$FILENAME

touch "$OUT"
rm "$OUT"

pushd src
zip -1 -r "$OUT" *
popd
