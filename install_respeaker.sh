#!/bin/bash

set -e

if [ -f "setup_respeaker_complete" ]; then
	echo "skip respeaker setup"
	exit 1
fi

pip install paho-mqtt
# Respeaker installation
git clone https://github.com/respeaker/seeed-voicecard
cd seeed-voicecard
sudo ./install.sh 4mic
#sudo ./install.sh 2mic
# respeaker ring
git clone --depth 1 https://github.com/respeaker/pixel_ring.git
cd pixel_ring
pip install -r requirements.txt
pip install -U -e .
cd ../../
touch setup_respeaker_complete
echo "Setup complete"
