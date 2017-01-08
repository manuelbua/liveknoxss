#!/bin/bash

FILENAME=liveknoxss-dev-`gitver current`.xpi
OUT=bin/$FILENAME

mkdir bin 2>/dev/null
rm -f "$OUT"

pushd src
zip -1 -r "../$OUT" *
popd
