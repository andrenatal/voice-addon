#!/bin/bash

rm -rf voice-addon*.tgz
rm -rf node_modules
npm install --production
rm -f SHA256SUMS
sha256sum package.json *.js LICENSE > SHA256SUMS
sha256sum deps/dependencies.zip deps/install_deps.sh assets/end_spot.wav >> SHA256SUMS
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS
TARFILE=$(npm pack)
tar xzf ${TARFILE}
cp -r deps ./package
cp -r node_modules ./package
tar czf ${TARFILE} package
rm -rf package
echo "Created ${TARFILE}"