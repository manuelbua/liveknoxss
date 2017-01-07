#!/bin/bash

FILENAME=liveknoxss-extension.xpi
OUT=/tmp/$FILENAME

touch "$OUT"
rm "$OUT"

pushd src
zip -1 -r "$OUT" *
popd