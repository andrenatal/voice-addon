/**
 * voice-adapter.js - Voice adapter.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const mqtt = require('mqtt');
const https = require('https');
const spawn = require('child_process').spawn;
const fs = require('fs');
const {Adapter, Device, Property, Event} = require('gateway-addon');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let token, keyword, speaker, microphone;
let pixel_ring_service;

class ActiveProperty extends Property {
  constructor(device, name, propertyDescription) {
    super(device, name, propertyDescription);
    this.setCachedValue(propertyDescription.value);
    this.device.notifyPropertyChanged(this);
  }

  /**
   * Set the value of the property.
   *
   * @param {*} value The new value to set
   * @returns a promise which resolves to the updated value.
   *
   * @note it is possible that the updated value doesn't match
   * the value passed in.
   */
  setValue(value) {
    if (value) {
      // spawn training
      console.log('spawn training');
      this.training_process = spawn(
        'python2',
        ['script_recording.py', keyword],
        {cwd: __dirname}
      );
      this.training_process.stdout.setEncoding('utf8');
      this.training_process.stdout.on('data', (data) => {
        console.log(`DATA: ${data.toString()}`);
      });
      this.training_process.stderr.on('data', (data) => {
        console.log(`ERROR: ${data.toString()}`);
      });
      this.training_process.on('close', (code) => {
        console.log(`process exit code ${code}`);
        this.setCachedValue(false);
        this.device.notifyPropertyChanged(this);
      });
      this.device.eventNotify(new Event(this.device,
        'training',
        'started'));
    } else {
      console.log('shutdown training');
      // shutdown training
      if (this.training_process) {
        this.training_process.stderr.pause();
        this.training_process.stdout.pause();
        this.training_process.stdin.pause();
        this.training_process.kill('SIGTERM');
        this.device.eventNotify(new Event(this.device,
          'training',
          'ended'));
      }
    }
    return new Promise((resolve, reject) => {
      super.setValue(value).then((updatedValue) => {
        resolve(updatedValue);
        this.device.notifyPropertyChanged(this);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

class VoiceDevice extends Device {
  constructor(adapter, id, deviceDescription) {
    super(adapter, id);
    this.name = deviceDescription.name;
    this.type = deviceDescription.type;
    this['@type'] = deviceDescription['@type'];
    this.description = deviceDescription.description;
    for (const propertyName in deviceDescription.properties) {
      const propertyDescription = deviceDescription.properties[propertyName];
      const property = new ActiveProperty(this, propertyName,
                                          propertyDescription);
      this.properties.set(propertyName, property);
    }

    for (const event in deviceDescription.events) {
      console.log('addedEvent', deviceDescription.events[event].name,deviceDescription.events[event].metadata);
      this.addEvent(deviceDescription.events[event].name,
                    deviceDescription.events[event].metadata);
    }

    this.mqttListener = new MqttListener(this);
    this.mqttListener.connect();
  }
}

class MqttListener {
  constructor(device) {
    // connect to snips mqtt
    this.client = mqtt.connect('mqtt://127.0.0.1');
    this.HERMES_KWS = 'hermes/hotword/default/detected';
    this.HERMES_ASR = 'hermes/asr/textCaptured';
    setInterval(this.call_things_api.bind(this), 10000);
    this.things = [];
    this.device = device;
  }

  connect() {
    this.client.on('connect', function() {
      console.log('conectado');
      this.call_things_api();
      this.client.subscribe(this.HERMES_KWS, function(err) {
        if (err) {
          console.log('mqtt error hermes/hotword/default/detected');
        }
      });
      this.client.subscribe(this.HERMES_ASR, function(err) {
        if (err) {
          console.log('mqtt error hermes/asr/textCaptured');
        }
      });
    }.bind(this));

    this.client.on('message', function(topic, message) {
      if (topic === this.HERMES_ASR) {
        console.log(`mensagem no mqtt no addon ${message}`);
        this.call_commands_api(JSON.parse(message));
        this.device.eventNotify(new Event(this.device,
          'speechinput',
          'detected'));
      } else if (topic === this.HERMES_KWS) {
        this.device.eventNotify(new Event(this.device,
          'wakeword',
          'detected'));
        spawn(
          'aplay',
          ['end_spot.wav'],
          {cwd: __dirname + "/assets"}
        );
      }
    }.bind(this));
  }

  call_commands_api(command) {
    try {
      const postData = JSON.stringify({
        text: command.text,
      });
      this.doHTTPRequest('/commands', postData);
      this.device.eventNotify(new Event(this.device,
        'command',
        command.text));
    } catch (err) {
        console.log(`Error calling commands api: ${err}`)
        this.device.eventNotify(new Event(this.device,
          'command',
          `Error calling commands api: ${err}`));
      }
  }

  call_things_api() {
    this.doHTTPRequest('/things', null, (response) => {

      try {
        const json_things = JSON.parse(response);
        const temp_things = [];
        for (const i in json_things) {
          for (const key in json_things[i]) {
            if (key === 'name') {
              temp_things.push(json_things[i][key]);
            }
          }
        }

        if (JSON.stringify(temp_things.sort()) !==
            JSON.stringify(this.things.sort())) {
          console.log('different set of things. retrain: ');
          const train_json = {
            operations: [['addFromVanilla', {thing: []}]],
          };
          train_json.operations[0][1].thing = temp_things;
          this.things = temp_things;
          this.client.publish('hermes/injection/perform',
                              JSON.stringify(train_json));
        }
      } catch (err) {
        console.log(`Error calling things api: ${err}`)
      }
    });
  }

  doHTTPRequest(command, postData, callback) {
    if (token === '') {
      console.log(`Token not set. Aborting call`);
      return;
    }
    let method = 'POST';
    if (postData === null) {
      postData = '';
      method = 'GET';
    }
    const options = {
      hostname: '127.0.0.1',
      port: 4443,
      path: `${command}`,
      method: `${method}`,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData),
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        chunks += chunk;
      });
      res.on('end', () => {
        if (callback) {
          callback(chunks);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(postData);
    req.end();
  }
}

class VoiceAdapter extends Adapter {
  constructor(addonManager, packageName) {
    super(addonManager, 'VoiceAdapter', packageName);
    addonManager.addAdapter(this);
  }

  /**
   * Example process to add a new device to the adapter.
   *
   * The important part is to call: `this.handleDeviceAdded(device)`
   *
   * @param {String} deviceId ID of the device to add.
   * @param {String} deviceDescription Description of the device to add.
   * @return {Promise} which resolves to the device added.
   */
  addDevice(deviceId, deviceDescription) {
    return new Promise((resolve, reject) => {
      if (deviceId in this.devices) {
        reject(`Device: ${deviceId} already exists.`);
      } else {
        const device = new VoiceDevice(this, deviceId, deviceDescription);
        this.handleDeviceAdded(device);
        resolve(device);
      }
    });
  }

  /**
   * Example process ro remove a device from the adapter.
   *
   * The important part is to call: `this.handleDeviceRemoved(device)`
   *
   * @param {String} deviceId ID of the device to remove.
   * @return {Promise} which resolves to the device removed.
   */
  removeDevice(deviceId) {
    return new Promise((resolve, reject) => {
      const device = this.devices[deviceId];
      if (device) {
        this.handleDeviceRemoved(device);
        resolve(device);
      } else {
        reject(`Device: ${deviceId} not found.`);
      }
    });
  }

  /**
   * Start the pairing/discovery process.
   *
   * @param {Number} timeoutSeconds Number of seconds to run before timeout
   */
  startPairing(_timeoutSeconds) {
    console.log('VoiceAdapter:', this.name,
                'id', this.id, 'pairing started');
  }

  /**
   * Cancel the pairing/discovery process.
   */
  cancelPairing() {
    console.log('VoiceAdapter:', this.name, 'id', this.id,
                'pairing cancelled');
  }

  /**
   * Unpair the provided the device from the adapter.
   *
   * @param {Object} device Device to unpair with
   */
  removeThing(device) {
    console.log('VoiceAdapter:', this.name, 'id', this.id,
                'removeThing(', device.id, ') started');

    this.removeDevice(device.id).then(() => {
      console.log('VoiceAdapter: device:', device.id, 'was unpaired.');
    }).catch((err) => {
      console.error('VoiceAdapter: unpairing', device.id, 'failed');
      console.error(err);
    });
  }

  /**
   * Cancel unpairing process.
   *
   * @param {Object} device Device that is currently being paired
   */
  cancelRemoveThing(device) {
    console.log('VoiceAdapter:', this.name, 'id', this.id,
                'cancelRemoveThing(', device.id, ')');
  }

  // cleanup
  unload() {
    return new Promise((resolve, reject) => {
      if (pixel_ring_service) {
        pixel_ring_service.stderr.pause();
        pixel_ring_service.stdout.pause();
        pixel_ring_service.stdin.pause();
        pixel_ring_service.kill('SIGTERM');
      }
      console.log(`unloaded addon ${pixel_ring_service}`);
      const snips_uninstall = spawn(
        'bash',
        ['install_deps.sh', 'uninstall'],
        {cwd: __dirname + '/deps'}
      );
      snips_uninstall.stdout.on('data', (data) => {
        console.log(`DATA snips_uninstall: ${data.toString()}`);
      });
      snips_uninstall.stderr.on('data', (data) => {
        console.log(`Error executing install_script.sh ${data}`);
      });
      snips_uninstall.on('close', (code) => {
        console.log(`End of snips_uninstall ${code}`);
        resolve();
      });
    })
  }
}

function loadVoiceAdapter(addonManager, manifest, _errorCallback) {
  checkInstallation();
  token = manifest.moziot.config.token;
  keyword = manifest.moziot.config.keyword;
  speaker = manifest.moziot.config.speaker;
  microphone = manifest.moziot.config.microphone;
  console.log(`microphone ${microphone}`);
  console.log(`speaker ${speaker}`);

  let capture_pcm = "";
  let playback_pcm = "";

  if (microphone === 'USB') {
    capture_pcm = "capture.pcm { \n type plug \n slave.pcm 'hw:1,0' \n }"
  }

  if (speaker === 'USB') {
    playback_pcm =  "playback.pcm { \n type plug \n slave.pcm 'hw:1,0' \n }"
  } else {
    playback_pcm =  "playback.pcm { \n type plug \n slave.pcm 'hw:0,0' \n }"
  }

  console.log('writing asound.conf');
  let asound_tpl = `pcm.!default { \n type asym \n ${playback_pcm} \n ${capture_pcm} \n } \n`
  fs.writeFileSync(`${__dirname}/asound.conf`, asound_tpl)
  const snips_installation = spawn(
    'bash',
    ['install_asound.sh'],
    {cwd: __dirname}
  );
  console.log('asound.conf written');

  const restart_audio_server = spawn(
    'sudo',
    ['systemctl', 'restart', 'snips-audio-server'],
    {cwd: __dirname}
  );

  const adapter = new VoiceAdapter(addonManager, manifest.name);
  const device = new VoiceDevice(adapter, 'voice-controller', {
    name: 'voice-controller',
    '@type': ['OnOffSwitch'],
    type: 'onOffSwitch',
    description: 'Voice Controller',
    properties: {
      on: {
        '@type': 'OnOffProperty',
        label: 'On/Off',
        name: 'on',
        type: 'boolean',
        value: false,
      },
    },
    events: [
      {
        name: 'wakeword',
        metadata: {
          description: 'A wakeword was deteced',
          type: 'string',
        },
      },
      {
        name: 'speechinput',
        metadata: {
          description: 'A voice command was detected',
          type: 'string',
        },
      },
      {
        name: 'command',
        metadata: {
          description: 'A web thing command was executed',
          type: 'string',
        },
      },
      {
        name: 'training',
        metadata: {
          description: 'Wakeword training started',
          type: 'string',
        },
      },
    ],
  });
  adapter.handleDeviceAdded(device);
}

function checkInstallation() {
  const snips_installation = spawn(
    'bash',
    ['install_deps.sh', 'install'],
    {cwd: __dirname + '/deps'}
  );
  snips_installation.stdout.on('data', (data) => {
    console.log(`DATA snips_installation: ${data.toString()}`);
  });
  snips_installation.stderr.on('data', (data) => {
    console.log(`Error executing install_script.sh ${data}`);
  });
}

module.exports = loadVoiceAdapter;
