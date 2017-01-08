#!/bin/bash

# import `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` env variables
source ~/.bashrc

# get current version, remove hash for proper Mozilla format
MOZVER=`gitver current | sed 's/+.*//g'`

# temporarily set the Mozilla format version string
sed -i 's/"(dev)"/"'$MOZVER'"/g' src/manifest.json

# for this to work the `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` env variables must be set
web-ext sign -s src/ -a bin/

sed -i 's/"'$MOZVER'"/"(dev)"/g' src/manifest.json