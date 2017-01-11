#!/bin/bash

if [ -z "$1" ]; then
	echo 'Please specify a starting position'
	exit 1
fi

if [ -z "$2" ]; then
	echo 'Please specify an ending position'
	exit 1
fi


./gitlog-to-changelog.pl --format='* %s%n%n%b' --strip-tab -- "$1".."$2"
