#!/bin/bash

srcdir=../gomidata
dstdir=./data
files=($(ls ${srcdir}/gomidata_*.json))
for file in ${files[@]}; do
	cp -v ${file} ${dstdir}
done
echo "終わりました。"
 
