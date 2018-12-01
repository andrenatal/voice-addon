1 - Install Snips platform

sudo apt-get update
sudo apt-get install -y dirmngr
sudo bash -c  'echo "deb https://raspbian.snips.ai/$(lsb_release -cs) stable main" > /etc/apt/sources.list.d/snips.list'
sudo apt-key adv --keyserver pgp.mit.edu --recv-keys D4F50CDCA10A2849  (se falhar tem outro keyserver para usar)
​sudo apt-get update
sudo apt-get install -y snips-platform-voice snips-injection python-numpy python-pyaudio python-soundfile

copia o assistant default para: /usr/share/snips/assistant (atentar para permissao correta!)

npm install mqtt --save
