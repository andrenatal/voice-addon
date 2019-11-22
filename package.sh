#!/bin/bash

rm -rf voice-addon*.tgz
rm -rf node_modules
npm install --production
rm -f SHA256SUMS
sha256sum manifest.json package.json *.js LICENSE README.md > SHA256SUMS
sha256sum deps/dependencies.zip deps/install_deps.sh assets/end_spot.wav >> SHA256SUMS
rm -rf node_modules/.bin
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS
TARFILE=$(npm pack)
tar xzf ${TARFILE}
cp -r node_modules ./package
tar czf ${TARFILE} package
rm -rf package
echo "Created ${TARFILE}"
