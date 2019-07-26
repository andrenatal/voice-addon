#!/bin/bash

set -e

required_packages=(
  libportaudio2_19.6.0-1_armhf.deb
  python-ply_3.9-1_all.deb
  python-pycparser_2.17-2_all.deb
  python-cffi_1.9.1-2_all.deb
  python-soundfile_0.8.1-2_all.deb
  python-numpy_1.1.12.1-3_armhf.deb
  python-pyaudio_0.2.11-1_armhf.deb
  libwebsockets8_2.0.3-2+b1~rpt1_armhf.deb
  mosquitto_1.4.10-3+deb9u4_armhf.deb
  snips-platform-common_0.63.2_armhf.deb
  snips-kaldi-atlas_0.24.2_armhf.deb
  snips-asr_0.63.2_armhf.deb
  snips-audio-server_0.63.2_armhf.deb
  snips-dialogue_0.63.2_armhf.deb
  snips-hotword_0.63.2_armhf.deb
  snips-injection_0.63.2_armhf.deb
  snips-nlu_0.63.2_armhf.deb
  snips-platform-voice_0.63.2_armhf.deb
  snips-tts_0.63.2_armhf.deb
  snips-watch_0.63.2_armhf.deb
)

check_pkg() {
    pkg_="$(cut -d'_' -f1 <<<"$1")"
    dpkg-query -s "$pkg_" >/dev/null 2>&1
}

install() {
	if [ -f "setup_complete" ]; then
    		echo "skip setup"
    		exit 1
	fi

	sudo apt-get update --allow-releaseinfo-change
	sudo apt-get install -y dirmngr
	sudo bash -c 'echo "deb https://raspbian.snips.ai/stretch stable main" > /etc/apt/sources.list.d/snips.list'
	sudo apt-key adv --keyserver pgp.mit.edu --recv-keys D4F50CDCA10A2849
	sudo apt-get update

	wget http://ftp.fr.debian.org/debian/pool/non-free/s/svox/libttspico-data_1.0+git20130326-9_armhf.deb
	wget http://ftp.fr.debian.org/debian/pool/non-free/s/svox/libttspico-utils_1.0+git20130326-9_armhf.deb
	wget http://ftp.fr.debian.org/debian/pool/non-free/s/svox/libttspico0_1.0+git20130326-9_armhf.deb
	sudo dpkg -i libttspico-data_1.0+git20130326-9_all.deb 
	sudo dpkg -i libttspico0_1.0+git20130326-9_armhf.deb 
	sudo dpkg -i libttspico-utils_1.0+git20130326-9_armhf.deb 
	rm libttspico*.deb

	sudo apt install libgfortran3
	sudo apt install libatlas3-base=3.10.3-8+rpi1

	unzip -o dependencies.zip -d .
	sudo unzip -o assistant_proj_heysnips.zip -d /usr/share/snips
	for pkg in ${required_packages[@]}; do
    		if ! check_pkg "$pkg"; then
	        	sudo dpkg -i "$pkg"
    			pkg_name="$(cut -d'_' -f1 <<<"$pkg")"
			echo "$pkg_name  hold" | sudo dpkg --set-selections
    		fi
	done
	sudo chown -R _snips:_snips /usr/share/snips/assistant/
	sudo cp snips.toml /etc/snips.toml
        sudo cp asound.conf /etc/
	sudo systemctl restart snips-hotword
	sudo systemctl restart snips-dialogue
	sudo systemctl restart snips-injection
	rm *.deb
        rm asound.conf
	rm assistant_proj_heysnips.zip
	rm snips.toml
	touch setup_complete
	echo "Setup complete"
}

uninstall() {
        for pkg in ${required_packages[@]}; do
     	    	pkg_="$(cut -d'_' -f1 <<<"$pkg")"
		sudo dpkg --purge --force-depends "$pkg_"
        done
	sudo rm -rf /usr/share/snips/
	rm setup_complete
        echo "Uninstall complete"
}

if [[ $1 == "install" ]]; then
	install
else
	uninstall
fi

