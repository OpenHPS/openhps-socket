import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, Model, DataFrame, Node, DataObject, DataSerializer, CallbackSinkNode } from '@openhps/core';
import * as http from 'http';
import * as io from 'socket.io-client';
import { SocketServer, SocketServerSource } from '../../../src';

describe('node server', () => {
    describe('remote source', () => {

        it('should host a websocket server', (done) => {
            const server = http.createServer();
            server.listen(1587);
            let client: io.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1"
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to(new CallbackSinkNode((frame: DataFrame) => {
                    server.close();
                    client.close();
                    done();
                }))
                .build().then(model => {
                    const frame = new DataFrame();
                    frame.addObject(new DataObject("abc"));
                    client = io.io("http://localhost:1587/api/v1");
                    client.emit('push', "source", DataSerializer.serialize(frame));
                });
        }).timeout(50000);

        it('should throw an error when building without server', (done) => {
            ModelBuilder.create()
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to()
                .build().then(model => {
                    done(`No error`);
                }).catch(ex => {
                    done();
                });
        });

        it('should host multiple websocket servers on the same server port', (done) => {
            const server = http.createServer();
            server.listen(1587);
            let client: io.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1"
                }))
                .from(new SocketServerSource({
                    uid: "source1"
                }))
                .to(new CallbackSinkNode((frame: DataFrame) => {
                    server.close();
                    client.close();
                    done();
                }))
                .from(new SocketServerSource({
                    uid: "source2"
                }))
                .to(new CallbackSinkNode((frame: DataFrame) => {
                    server.close();
                    client.close();
                    done();
                }))
                .build().then(model => {
                    const frame = new DataFrame();
                    frame.addObject(new DataObject("abc"));
                    client = io.io("http://localhost:1587/api/v1");
                    client.emit('push', "source1", DataSerializer.serialize(frame));
                });
        }).timeout(50000);

        it('should support pulling', (done) => {
            const server = http.createServer();
            server.listen(1587);
            let client: io.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1"
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to()
                .build().then(model => {
                    client = io.io("http://localhost:1587/api/v1");
                    client.on('pull', (e) => {
                        server.close();
                        client.close();
                        done();
                    });
                    setTimeout(() => {
                        Promise.resolve(model.pull());
                    }, 100);
                });
        }).timeout(50000);

    });
});