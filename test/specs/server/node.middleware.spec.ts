import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, DataFrame, DataObject, DataSerializer } from '@openhps/core';
import * as http from 'http';
import * as io from 'socket.io-client';
import { SocketServerSink, SocketServer } from '../../../src';

describe('node server', () => {
    describe('middleware', () => {

        it('should authenticate correct tokens', (done) => {
            const server = http.createServer();
            server.listen(1587);
            let client: io.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1",
                    middleware: [
                        (socket, next) => {
                            const token = socket.handshake.auth['token'];
                            if (token === "s3cret") {
                                next();
                            } else {
                                next(new Error('Unauthorized'));
                            }
                        }
                    ]
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    const frame = new DataFrame();
                    frame.addObject(new DataObject("abc"));
                    client = io.io("http://localhost:1587/api/v1", {
                        auth: {
                            token: "s3cret"
                        }
                    });
                    client.on('push', (uid: string, serializedFrame: any) => {
                        expect(uid).to.equal("sink");
                        const frame = DataSerializer.deserialize(serializedFrame);
                        client.close();
                        server.close();
                        done();
                    });
                    setTimeout(() => {
                        Promise.resolve(model.push(frame));
                    }, 100);
                });
        }).timeout(50000);

        it('should block unauthorized requests', (done) => {
            const server = http.createServer();
            server.listen(1587);
            let client: io.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1",
                    middleware: [
                        (socket, next) => {
                            const token = socket.handshake.auth['token'];
                            if (token === "s3cret") {
                                next();
                            } else {
                                next(new Error('Unauthorized'));
                            }
                        }
                    ]
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    const frame = new DataFrame();
                    frame.addObject(new DataObject("abc"));
                    client = io.io("http://localhost:1587/api/v1");
                    client.on('connect_error', () => {
                        client.close();
                        server.close();
                        done();
                    });
                    client.on('push', (uid: string, serializedFrame: any) => {
                        expect(uid).to.equal("sink");
                        const frame = DataSerializer.deserialize(serializedFrame);
                        client.close();
                        server.close();
                        done(`Error`);
                    });
                    setTimeout(() => {
                        Promise.resolve(model.push(frame));
                    }, 100);
                });
        }).timeout(50000);
    });
});