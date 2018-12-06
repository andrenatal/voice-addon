sudo apt-get update
sudo apt-get install -y dirmngr
sudo bash -c  'echo "deb https://raspbian.snips.ai/$(lsb_release -cs) stable main" > /etc/apt/sources.list.d/snips.list'
sudo apt-key adv --keyserver pgp.mit.edu --recv-keys D4F50CDCA10A2849  (se falhar tem outro keyserver para usar)
​sudo apt-get update
sudo apt-get install -y snips-platform-voice snips-injection python-numpy python-pyaudio python-soundfile
unzip assistant_proj.zip -d /usr/share/snips/assistant
mkdir /home/pi/.mozilla-iot/addons/voice-addon/personal_kws/
npm install mqtt --save
sudo systemctl restart snips-hotword; sudo systemctl restart snips-dialogue