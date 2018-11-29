/**
 * example-adapter.js - Example adapter.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

let Adapter, Device, Property, token, keyword;
const mqtt = require('mqtt');
const https = require('https');

try {
  Adapter = require('../adapter');
  Device = require('../device');
  Property = require('../property');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }

  const gwa = require('gateway-addon');
  Adapter = gwa.Adapter;
  Device = gwa.Device;
  Property = gwa.Property;
}

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

    this.mqttListener = new MqttListener();
    this.mqttListener.connect();
  }

}

class MqttListener {

  constructor() {
    // connect to snips mqtt
    this.client = mqtt.connect('mqtt://127.0.0.1');
    this.HERMES_KWS = 'hermes/hotword/default/detected';
    this.HERMES_ASR = 'hermes/asr/textCaptured';
  }

  connect() {
    this.client.on('connect', function() {
      console.log('conectado');
      this.client.subscribe(this.HERMES_KWS, function(err) {
        if (err) console.log('mqtt error hermes/hotword/default/detected');
      });
      this.client.subscribe(this.HERMES_ASR, function(err) {
        if (err) console.log('mqtt error hermes/asr/textCaptured');
      });
    }.bind(this));

    this.client.on('message', function(topic, message) {
      if (topic === this.HERMES_ASR) {
        console.log('mensagem no mqtt no addon' + message);
        this.call_commands_api(JSON.parse(message));
      }
    }.bind(this));
  }

  call_commands_api(command) {
    const postData = JSON.stringify({
      text: command.text,
    });
    console.log(`top ${postData} ${command}`);

    const options = {
      hostname: '127.0.0.1',
      port: 4443,
      path: '/commands',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData),
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    // write data to request body
    console.log(`requesting ${postData}`);
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
}

function loadVoiceAdapter(addonManager, manifest, _errorCallback) {
  token = manifest.moziot.config.token;
  keyword = manifest.moziot.config.keyword;
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
  });
  adapter.handleDeviceAdded(device);
}

module.exports = loadVoiceAdapter;
