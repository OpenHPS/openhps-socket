<h1 align="center">
  <img alt="OpenHPS" src="https://openhps.org/images/logo_text-512.png" width="40%" /><br />
  @openhps/socket
</h1>
<p align="center">
    <a href="https://ci.mvdw-software.com/job/openhps-socket/" target="_blank">
        <img alt="Build Status" src="https://ci.mvdw-software.com/job/openhps-socket/job/dev/badge/icon">
    </a>
    <a href="https://ci.mvdw-software.com/view/OpenHPS/job/openhps-socket/job/dev/lastCompletedBuild/testReport" target="_blank">
        <img alt="Tests" src="https://img.shields.io/jenkins/tests?compact_message&jobUrl=https%3A%2F%2Fci.mvdw-software.com%2Fview%2FOpenHPS%2Fjob%2Fopenhps-socket%2Fjob%2Fdev">
    </a>
    <a href="https://ci.mvdw-software.com/view/OpenHPS/job/openhps-socket/job/dev/lastCompletedBuild/cobertura/" target="_blank">
        <img alt="Code coverage" src="https://img.shields.io/jenkins/coverage/cobertura?jobUrl=https%3A%2F%2Fci.mvdw-software.com%2Fview%2FOpenHPS%2Fjob%2Fopenhps-socket%2Fjob%2Fdev%2F">
    </a>
    <a href="https://codeclimate.com/github/OpenHPS/openhps-socket/" target="_blank">
        <img alt="Maintainability" src="https://img.shields.io/codeclimate/maintainability/OpenHPS/openhps-socket">
    </a>
</p>

<h3 align="center">
    <a href="https://github.com/OpenHPS/openhps-core">@openhps/core</a> &mdash; <a href="https://openhps.org/docs/socket">API</a>
</h3>

<br />

This repository contains the socket server component for OpenHPS (Open Source Hybrid Positioning System). It includes nodes for remote socket connections (both client and server side).

OpenHPS is a data processing positioning framework. It is designed to support many different use cases ranging from simple positioning such as detecting the position of a pawn on a chessboard using RFID, to indoor positioning methods using multiple cameras.

## Features
- Socket communication between nodes and services.
- ```SocketClientNode``` is a node added on the client-side that can be used to push data frames to a server or pull information
from a server.

## Getting Started
If you have [npm installed](https://www.npmjs.com/get-npm), start using @openhps/csv with the following command.
```bash
npm install @openhps/socket --save
```

The client implementation is also distributed as ```openhps-socket-client.min.js``` for use in web applications.

### Usage
This section briefly describes how to use and get started with @openhps/socket.

#### Socket Server
The socket server is used in positioning models that have remotely accessible nodes or services. Serialized data frames pushed
to these nodes are deserialized and pushed to outgoing nodes. This allows developers to move parts of their graph to a
remote server.

The first step in creating remote nodes is to add the socket server as a service. To initialize the server you require an initialized
HTTP, HTTPS or socket.io server.
```typescript
ModelBuilder.create()
    .addService(new SocketServer({
        srv: server,
        path: "/api/v1"
    }))
    .addShape(/* ... */)
    .build().then(model => {
        /* ... */
    });
```

Once the service is added, you can add ```SocketClientNode``` implementations to act as a sink or source.

#### Socket Client
The socket client is used in positioning models to push and pull data from remote locations. Pushed data frames are serialized and pushed to a socket server.

## Contributors
The framework is open source and is mainly developed by PhD Student Maxim Van de Wynckel as part of his research towards *Hybrid Positioning and Implicit Human-Computer Interaction* under the supervision of Prof. Dr. Beat Signer.

## Contributing
Use of OpenHPS, contributions and feedback is highly appreciated. Please read our [contributing guidelines](CONTRIBUTING.md) for more information.

## License
Copyright (C) 2019-2021 Maxim Van de Wynckel & Vrije Universiteit Brussel

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.