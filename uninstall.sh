sudo apt -y remove snips-*
sudo apt -y remove snips-platform-voice
sudo apt -y remove python-numpy
sudo apt -y remove snips-injection
sudo apt -y remove snips-hotword
sudo apt -y remove snips-dialogue
sudo apt -y remove python-numpy
sudo apt -y remove python-pyaudio
sudo apt -y remove python-soundfile
sudo rm -rf /usr/share/snips/
sudo rm /etc/snips.toml
sudo rm /etc/asound.conf
sudo rm -rf /home/pi/.mozilla-iot/addons/voice-addon/personal_kws
sudo rm -rf /home/pi/.mozilla-iot/addons/voice-addon/
sudo apt-key remove D4F50CDCA10A2849
sudo rm -rf /etc/apt/sources.list.d/snips.list