import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, Model, DataFrame, DataObject, CallbackSinkNode, CallbackSourceNode } from '@openhps/core';
import { SocketClient, SocketServer, SocketServerSource, SocketClientSink, SocketServerSink, SocketClientSource } from '../../../src';
import * as http from 'http';

describe('node client', () => {
    describe('remote sink', () => {

        it('should build a model without connecting', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to(new CallbackSinkNode((frame: DataFrame) => {

                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient())
                        .from()
                        .to(new SocketClientSink({
                            uid: "source"
                        }))
                        .build().then(model => {
                            clientModel = model;
                            const frame = new DataFrame();
                            frame.addObject(new DataObject("abc"));
                            model.push(frame);
                            server.close();
                            serverModel.emit('destroy');
                            clientModel.emit('destroy');
                            done();
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should connect after building the model', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to(new CallbackSinkNode((frame: DataFrame) => {
                    expect(frame.getObjects()[0].uid).to.equal("abc");
                    server.close();
                    serverModel.emit('destroy');
                    clientModel.emit('destroy');
                    done();
                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient())
                        .from()
                        .to(new SocketClientSink({
                            uid: "source"
                        }))
                        .build().then((model: Model) => {
                            clientModel = model;
                            return (model.findService("SocketClient") as SocketClient).connect({
                                url: 'http://localhost:1587',
                                path: '/api/v1'
                            });
                        }).then(() => {
                            const frame = new DataFrame();
                            frame.addObject(new DataObject("abc"));
                            model.push(frame);
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should connect to a websocket server', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to(new CallbackSinkNode((frame: DataFrame) => {
                    expect(frame.getObjects()[0].uid).to.equal("abc");
                    server.close();
                    serverModel.emit('destroy');
                    clientModel.emit('destroy');
                    done();
                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .from()
                        .to(new SocketClientSink({
                            uid: "source"
                        }))
                        .build().then(model => {
                            clientModel = model;
                            const frame = new DataFrame();
                            frame.addObject(new DataObject("abc"));
                            model.push(frame);
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should forward server pulls to the client', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to()
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .from(new CallbackSourceNode(() => {
                            server.close();
                            serverModel.emit('destroy');
                            clientModel.emit('destroy');
                            done();
                            return null;
                        }))
                        .to(new SocketClientSink({
                            uid: "source"
                        }))
                        .build().then(model => {
                            clientModel = model;
                            Promise.resolve(serverModel.pull());
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(5000);

        it('should should throw an error connecting to a fake websocket server', (done) => {
            ModelBuilder.create()
                .addService(new SocketClient({
                    url: 'abc',
                    path: '/api/v1',
                    reconnectionAttempts: 0,
                    timeout: 1000
                }))
                .from()
                .to(new SocketClientSink({
                    uid: "source"
                }))
                .build().then(model => {
                    done('Model builded without error');
                }).catch(ex => {
                    done();
                })
        }).timeout(5500);

    });
});