import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, Model, DataFrame, DataObject, CallbackSinkNode, CallbackSourceNode } from '@openhps/core';
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
        
    });
});