bash package.sh
ssh pi@192.168.43.41 rm -rf /home/pi/.mozilla-iot/addons/voice-addon
scp voice-addon-*.tgz pi@192.168.43.41:/home/pi/.mozilla-iot/addons
ssh pi@192.168.43.41 tar -xzvf /home/pi/.mozilla-iot/addons/voice-addon-*.tgz -C /home/pi/.mozilla-iot/addons/
ssh pi@192.168.43.41 mv /home/pi/.mozilla-iot/addons/package /home/pi/.mozilla-iot/addons/voice-addon
ssh pi@192.168.43.41 sudo systemctl restart mozilla-iot-gateway