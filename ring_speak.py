#!/usr/bin/env python

import paho.mqtt.client as mqtt
import time
from pixel_ring import pixel_ring
from gpiozero import LED
import paho.mqtt.client as mqtt
import time
def on_message(client, userdata, message):
    if message.topic == "hermes/hotword/default/detected":
            pixel_ring.wakeup()
    if message.topic == "hermes/asr/textCaptured":
            pixel_ring.think()
            time.sleep(3)
            pixel_ring.off()
    #print("message received " ,str(message.payload.decode("utf-8")))
    print("message topic=",message.topic)
    #print("message qos=",message.qos)
    #print("message retain flag=",message.retain)


power = LED(5)
power.on()
pixel_ring.set_brightness(10)
broker_address="127.0.0.1"
print("creating new instance")
client = mqtt.Client("P1")
client.on_message=on_message
print("connecting to broker")
client.connect(broker_address)
client.loop_start()
print("Subscribing to topic","hermes/hotword/default/detected")
client.subscribe("hermes/hotword/default/detected")
print("Subscribing to topic","hermes/asr/textCaptured")
client.subscribe("hermes/asr/textCaptured")
while True:
	time.sleep(1)
