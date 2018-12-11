sudo apt-get update
sudo apt-get install -y dirmngr
sudo bash -c  'echo "deb https://raspbian.snips.ai/$(lsb_release -cs) stable main" > /etc/apt/sources.list.d/snips.list'
sudo apt-key adv --keyserver pgp.mit.edu --recv-keys D4F50CDCA10A2849
sudo apt-get update
sudo apt-get install -y snips-platform-voice snips-injection python-numpy python-pyaudio python-soundfile
sudo unzip -o assistant_proj.zip -d /usr/share/snips
sudo cp snips.toml /etc/
sudo systemctl restart snips-hotword; sudo systemctl restart snips-dialogue