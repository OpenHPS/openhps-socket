import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, Model, DataFrame, DataObject, CallbackSinkNode, CallbackSourceNode, GraphBuilder } from '@openhps/core';
import { SocketClient, SocketServer, SocketServerSource, SocketClientSink, SocketClientSource, SocketServerSink } from '../../../src';
import * as http from 'http';

describe('node client', () => {
    describe('remote source', () => {

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
                .from(new CallbackSourceNode(() => {
                    serverModel.emit('destroy');
                    clientModel.emit('destroy');
                    done();
                    return undefined;
                }))
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .from(new SocketClientSource({
                            uid: "sink"
                        }))
                        .to()
                        .build().then(model => {
                            clientModel = model;
                            return clientModel.pull();
                        }).then(() => {
                            
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should forward server pushes to the client', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .from(new SocketClientSource({
                            uid: "sink"
                        }))
                        .to(new CallbackSinkNode(frame => {
                            server.close();
                            serverModel.emit('destroy');
                            clientModel.emit('destroy');
                            done();
                        }))
                        .build().then(model => {
                            clientModel = model;
                            const frame = new DataFrame();
                            frame.addObject(new DataObject("abc"));
                            Promise.resolve(serverModel.push(frame));
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should forward server pushes to the correct client', (done) => {
            let client1Model: Model<any, any>;
            let client2Model: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            let count = 0;

            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from(new SocketServerSource({
                    uid: "source"
                }))
                .to(new SocketServerSink({
                    uid: "sink",
                    broadcast: false
                }))
                .build().then(model => {
                    serverModel = model;
                    const client1 = ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .addShape(GraphBuilder.create()
                            .from("input")
                            .to(new SocketClientSink({
                                uid: "source"
                            })))
                        .addShape(GraphBuilder.create()
                            .from(new SocketClientSource({
                                uid: "sink"
                            }))
                            .to(new CallbackSinkNode(function(frame, options) {
                                expect(this.model.findService(SocketClient).clientId, (options as any).clientId);
                                count++;
                                if (count === 2) {
                                    client1Model.emit('destroy');
                                    client2Model.emit('destroy');
                                    serverModel.emit('destroy');
                                    done();
                                }
                            })));
                        const client2 = ModelBuilder.create()
                            .addService(new SocketClient({
                                url: 'http://localhost:1587',
                                path: '/api/v1'
                            }))
                            .addShape(GraphBuilder.create()
                                .from("input")
                                .to(new SocketClientSink({
                                    uid: "source"
                                })))
                            .addShape(GraphBuilder.create()
                                .from(new SocketClientSource({
                                    uid: "sink"
                                }))
                                .to(new CallbackSinkNode(function(frame, options) {
                                    expect(this.model.findService(SocketClient).clientId, (options as any).clientId);
                                    count++;
                                    if (count === 2) {
                                        client1Model.emit('destroy');
                                        client2Model.emit('destroy');
                                        serverModel.emit('destroy');
                                        done();
                                    }
                                })));
                    Promise.all([client1.build(), client2.build()]).then(models => {
                        client1Model = models[0];
                        client2Model = models[1];
                        const frame = new DataFrame();
                        frame.addObject(new DataObject("abc"));
                        return Promise.all([
                            client2Model.findNodeByName("input").push(frame),
                            client1Model.findNodeByName("input").push(frame)
                        ]);
                    }).catch(ex => {
                        done(ex);
                    });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should forward client errors to the server', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .from(new SocketClientSource({
                            uid: "sink"
                        }))
                        .to(new CallbackSinkNode(frame => {
                            throw new Error(`Client Error`);
                        }))
                        .build().then(model => {
                            clientModel = model;
                            const frame = new DataFrame();
                            frame.addObject(new DataObject("abc"));
                            serverModel.once('error', err => {
                                server.close();
                                serverModel.emit('destroy');
                                clientModel.emit('destroy');
                                done();
                            });
                            serverModel.push(frame);
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);

        it('should forward client completed events to the server', (done) => {
            let clientModel: Model<any, any>;
            let serverModel: Model<any, any>;

            const server = http.createServer();
            server.listen(1587);
            
            ModelBuilder.create()
                .addService(new SocketServer({
                    path: "/api/v1",
                    srv: server
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    serverModel = model;
                    ModelBuilder.create()
                        .addService(new SocketClient({
                            url: 'http://localhost:1587',
                            path: '/api/v1'
                        }))
                        .from(new SocketClientSource({
                            uid: "sink"
                        }))
                        .to(new CallbackSinkNode())
                        .build().then(model => {
                            clientModel = model;
                            const frame = new DataFrame();
                            frame.addObject(new DataObject("abc"));
                            serverModel.push(frame);
                            serverModel.once('completed', event => {
                                // Completed locally
                                serverModel.once('completed', event => {
                                    // Completed on remote server
                                    server.close();
                                    serverModel.emit('destroy');
                                    clientModel.emit('destroy');
                                    done();
                                });
                            });
                        }).catch(ex => {
                            done(ex);
                        });
                }).catch(ex => {
                    done(ex);
                });
        }).timeout(50000);
        
    });
});