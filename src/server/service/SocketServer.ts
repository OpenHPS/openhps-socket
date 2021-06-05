import { DataSerializer, DataFrame, PushOptions, PullOptions, RemoteNodeService } from '@openhps/core';
import * as io from 'socket.io';
import * as http from 'http';
import * as https from 'https';
import { ServerOptions } from '../nodes/ServerOptions';

/**
 * Socket server
 */
export class SocketServer extends RemoteNodeService {
    private _server: io.Server;
    private _namespace: io.Namespace;
    private _clients: io.Socket[] = [];
    private _options: ServerOptions;

    constructor(options?: ServerOptions) {
        super();
        const defaultOptions = new ServerOptions();
        // tslint:disable-next-line
        this._options = Object.assign(defaultOptions, options);
        this._options.middleware = this._options.middleware || [];

        this.once('build', this._onBuild.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve) => {
            switch (this._options.srv.constructor) {
                case http.Server:
                case https.Server:
                    this._server = new io.Server(this._options.srv as http.Server | https.Server, {
                        transports: ['polling', 'websocket'],
                    });
                    this.logger('debug', {
                        message: 'Socket server opened!',
                    });
                    break;
                default:
                    this._server = this._options.srv as io.Server;
                    break;
            }

            this._namespace = this._server.of(this._options.path);
            this._namespace.on('connection', this._onConnect.bind(this));
            this._options.middleware.forEach((middleware) => {
                this._namespace.use(middleware);
            });
            this.logger('debug', {
                message: 'Socket namespace created!',
                path: this._options.path,
            });
            resolve();
        });
    }

    private _onDestroy(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this._server !== undefined) {
                this._server.close();
            }
            resolve();
        });
    }

    private _onConnect(socket: io.Socket): void {
        this._clients.push(socket);
        this.logger('debug', {
            message: 'New client socket connection opened!',
        });
        this.emit('connection', socket);
        // Message events
        socket.on('push', this.localPush.bind(this));
        socket.on('pull', this.localPull.bind(this));
        socket.on('event', this.localEvent.bind(this));
        // Disconnect event
        socket.once('disconnect', this._onDisconnect.bind(this));
    }

    private _onDisconnect(socket: io.Socket): void {
        this.emit('disconnect', socket);
        this._clients.splice(this._clients.indexOf(socket), 1);
        this.logger('debug', {
            message: 'Client socket connection closed!',
        });
    }

    public remotePush<T extends DataFrame | DataFrame[]>(uid: string, frame: T, options?: PushOptions): Promise<void> {
        return new Promise((resolve) => {
            this._namespace.compress(true).emit('push', uid, DataSerializer.serialize(frame), options);
            resolve();
        });
    }

    public remotePull(uid: string, options?: PullOptions): Promise<void> {
        return new Promise((resolve) => {
            this._namespace.emit('pull', uid, options);
            resolve();
        });
    }

    public remoteEvent(uid: string, event: string, arg: any): Promise<void> {
        return new Promise((resolve) => {
            this._namespace.compress(true).emit('event', uid, event, arg);
            resolve();
        });
    }

    public get clients(): io.Socket[] {
        return this._clients;
    }

    public get server(): io.Server {
        return this._server;
    }

    public get namespace(): io.Namespace {
        return this._namespace;
    }
}
