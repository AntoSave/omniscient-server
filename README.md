# Omniscient Node.js Application Server
Omniscient is an open source platform for home monitoring and security. It is composed of sensors, alarms, an iOS app and an application server.
![Omniscient back-end architecture](/assets/images/back-end-architecture.png)

This repository contains the Node.js application server which:
- serves a REST API made with Express framework. This API used by the iOS app to manage users, rooms, sensors and sirens.
- serves an API which uses PSWS (a WebSocket-based protocol) to send istantaneus data coming from the sensors to the iOS app.
- analyses real-time data coming from the sensors (through Telegraf) to enable sirens on the occurrance of dangerous events (like the detection of a movement).
- uses an MQTT client to publish commands for the sensors and the actuators on the broker

### Genesis
This repo is part of Omniscient, a project I made in collaboration with @my-rice for my Bachelor's thesis in Computer Engineering.