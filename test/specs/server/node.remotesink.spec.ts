import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, DataFrame, DataObject, DataSerializer } from '@openhps/core';
import * as http from 'http';
import * as io from 'socket.io-client';
import * as express from 'express';
import { SocketServerSink, SocketServer } from '../../../src';

describe('node', () => {
    describe('remote sink', () => {

        it('should host a websocket server', (done) => {
            const server = http.createServer();
            server.listen(1587);
            let client: SocketIOClient.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1"
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    const frame = new DataFrame();
                    frame.addObject(new DataObject("abc"));
                    client = io("http://localhost:1587/api/v1");
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

        it('should host a websocket server alongside express', (done) => {
            const app = express();
            app.use(express.json());
            app.use('/', express.static('./static'));

            const server = http.createServer(app);
            server.listen(1587);
            
            let client: SocketIOClient.Socket = null;
            ModelBuilder.create()
                //.withLogger((level: string, log: any) => console.log(log))
                .addService(new SocketServer({
                    srv: server,
                    path: "/api/v1"
                }))
                .from()
                .to(new SocketServerSink({
                    uid: "sink"
                }))
                .build().then(model => {
                    const frame = new DataFrame();
                    frame.addObject(new DataObject("abc"));
                    client = io("http://localhost:1587/api/v1");
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

    });
});