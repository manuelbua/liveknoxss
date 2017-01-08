#!/bin/bash

# unset `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` env variables or `web-ext` will not work

unset WEB_EXT_API_KEY
unset WEB_EXT_API_SECRET

pushd src
web-ext run --firefox-profile=default
popd