bash package.sh
rm -rf /Volumes/homes/.mozilla-iot/addons/voice-addon
tar -xzvf $(ls voice-addon-*.tgz) -C /Volumes/homes/.mozilla-iot/addons
mv /Volumes/homes/.mozilla-iot/addons/package /Volumes/homes/.mozilla-iot/addons/voice-addon
ssh pi@192.168.0.45 sudo systemctl restart mozilla-iot-gateway