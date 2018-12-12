#!/bin/bash

set -e

required_packages=(
    snips-platform-voice
    snips-injection
    python-numpy
    python-pyaudio
    python-soundfile
)

updated=0

run_update() {
    if [ "$updated" = "0" ]; then
        if ! check_pkg dirmngr; then
            sudo apt-get update
            sudo apt-get install -y dirmngr
        fi

        sudo bash -c 'echo "deb https://raspbian.snips.ai/$(lsb_release -cs) stable main" > /etc/apt/sources.list.d/snips.list'
        sudo apt-key adv --keyserver pgp.mit.edu --recv-keys D4F50CDCA10A2849
        sudo apt-get update
        updated=1
    fi
}

check_pkg() {
    dpkq-query -s "$1" >/dev/null 2>&1
}

install_pkg() {
    run_update
    sudo apt-get install -y "$1"
}

for pkg in ${required_packages[@]}; do
    if ! check_pkg "$pkg"; then
        install_pkg "$pkg"
    fi
done

sudo unzip -o assistant_proj.zip -d /usr/share/snips
sudo cp snips.toml /etc/
sudo systemctl restart snips-hotword
sudo systemctl restart snips-dialogue
