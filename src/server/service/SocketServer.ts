import {
    DataFrame,
    PullOptions,
    RemoteService,
    RemotePushOptions,
    DataSerializer,
    Node,
    RemoteNodeOptions,
} from '@openhps/core';
import * as io from 'socket.io';
import * as http from 'http';
import * as https from 'https';
import { ServerOptions } from '../nodes/ServerOptions';
import { settleServicePromise } from '../../common/settleServicePromise';

/**
 * Socket server
 */
export class SocketServer extends RemoteService {
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

        this.once('build', this._onInit.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    private _onInit(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._options.srv === undefined) {
                reject(new Error('No server provided!'));
                return;
            }
            switch (this._options.srv.constructor) {
                case http.Server:
                case https.Server:
                    this._server = new io.Server(this._options.srv as http.Server | https.Server, {
                        transports: ['polling', 'websocket'],
                    });
                    this.logger('debug', 'Socket server opened!');
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
            this.logger('debug', 'Socket namespace created!', this._options.path);
            resolve();
        });
    }

    private _onDestroy(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this._server !== undefined) {
                this._server.close((e) => {
                    if (e !== undefined) {
                        this.logger('error', e.message, e);
                    }
                });
            }
            resolve();
        });
    }

    private _onConnect(socket: io.Socket): void {
        this._clients.push(socket);
        this.logger('debug', 'New client socket connection opened!');
        this.emit('connection', socket);
        // Message events
        socket.on('push', (uid, frame, options) => {
            this.localPush(uid, frame, {
                ...options,
                clientId: socket.id,
            });
        });
        socket.on('pull', (uid, options) => {
            this.localPull(uid, {
                ...options,
                clientId: socket.id,
            });
        });
        socket.on('event', (uid, event, ...args) => {
            this.localEvent(uid, event, ...args);
        });
        socket.on('service', (uuid, uid, method, ...args) => {
            Promise.resolve(this.localServiceCall(uid, method, ...args))
                .then((result) => {
                    this._namespace.compress(true).emit('service-resolve', uuid, DataSerializer.serialize(result));
                })
                .catch((ex) => {
                    this._namespace.compress(true).emit('service-reject', uuid, ex);
                });
        });
        socket.on('service-resolve', (uuid, result) => {
            settleServicePromise(this.promises, uuid, result, false);
        });
        socket.on('service-reject', (uuid, result) => {
            settleServicePromise(this.promises, uuid, result, true);
        });
        // Disconnect event
        socket.once('disconnect', () => {
            this._onDisconnect(socket);
        });
    }

    private _onDisconnect(socket: io.Socket): void {
        this.emit('disconnect', socket);
        const index = this._clients.indexOf(socket);
        if (index !== -1) {
            this._clients.splice(index, 1);
        }
        this.logger('debug', 'Client socket connection closed!');
    }

    public remotePush<T extends DataFrame | DataFrame[]>(
        uid: string,
        frame: T,
        options?: RemotePushOptions,
    ): Promise<void> {
        return new Promise((resolve) => {
            let connection: io.Socket | io.Namespace = this._namespace;
            if (options?.broadcast === false) {
                connection = this._clients.find((client) => client.id === options.clientId);
            }

            if (connection) {
                const node = this.model.findNodeByUID(uid) as Node<any, any>;
                const nodeOptions = node.getOptions() as RemoteNodeOptions<this>;
                connection.compress(true).emit('push', uid, nodeOptions.serialize(frame as any), options);
            }
            resolve();
        });
    }

    public remotePull(uid: string, options?: PullOptions): Promise<void> {
        return new Promise((resolve) => {
            this._namespace.compress(true).emit('pull', uid, options);
            resolve();
        });
    }

    public remoteEvent(uid: string, event: string, ...args: any[]): Promise<void> {
        return new Promise((resolve) => {
            this._namespace.compress(true).emit('event', uid, event, ...args);
            resolve();
        });
    }

    public remoteServiceCall(uid: string, method: string, ...args: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const uuid = this.generateUUID();
            this._namespace.compress(true).emit('service', uuid, uid, method, ...args);
            this.promises.set(uuid, { resolve, reject });
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
