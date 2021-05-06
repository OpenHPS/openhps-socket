import {
    Service,
    DataSerializer,
    DataFrame,
    Node,
    PushOptions,
    PullOptions,
    PushError,
    PushCompletedEvent,
} from '@openhps/core';
import * as io from 'socket.io';
import * as http from 'http';
import * as https from 'https';
import { ServerOptions } from '../nodes/ServerOptions';

/**
 * Socket server
 */
export class SocketServer extends Service {
    private _server: io.Server;
    private _namespace: io.Namespace;
    private _clients: io.Socket[] = [];
    private _options: ServerOptions;
    private _nodes: Map<string, Node<any, any>> = new Map();

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
        socket.on('push', this._onPush.bind(this));
        socket.on('pull', this._onPull.bind(this));
        socket.on('error', this._onError.bind(this));
        socket.on('completed', this._onCompleted.bind(this));
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

    private _onPush(uid: string, serializedFrame: any, options?: PushOptions): void {
        options = options || {};
        if (this._nodes.has(uid)) {
            // Parse frame and options
            const frameDeserialized = DataSerializer.deserialize(serializedFrame);
            this._nodes.get(uid).emit('localpush', frameDeserialized, options);
        }
    }

    private _onPull(uid: string, options?: PullOptions): void {
        options = options || {};
        if (this._nodes.has(uid)) {
            this._nodes.get(uid).emit('localpull', options);
        }
    }

    private _onError(uid: string, error: PushError): void {
        if (this._nodes.has(uid)) {
            this._nodes.get(uid).emit('localerror', error);
        }
    }

    private _onCompleted(uid: string, event: PushCompletedEvent): void {
        if (this._nodes.has(uid)) {
            this._nodes.get(uid).emit('localcompleted', event);
        }
    }

    /**
     * Send a push to a specific remote node
     *
     * @param {string} uid Remote Node UID
     * @param {DataFrame} frame Data frame to push
     * @param {PushOptions} [options] Push options
     */
    public push<T extends DataFrame | DataFrame[]>(uid: string, frame: T, options?: PushOptions): void {
        this._namespace.compress(true).emit('push', uid, DataSerializer.serialize(frame), options);
    }

    /**
     * Send a pull request to a specific remote node
     *
     * @param {string} uid Remote Node UID
     * @param {PullOptions} [options] Pull options
     */
    public pull(uid: string, options?: PullOptions): void {
        this._namespace.emit('pull', uid, options);
    }

    /**
     * Send an error to a remote node
     *
     * @param {string} uid Remote Node UID
     * @param {PushError} error Push error
     */
    public sendError(uid: string, error: PushError): void {
        this._namespace.emit('error', uid, error);
    }

    /**
     * Send a completed event to a remote node
     *
     * @param {string} uid Remote Node UID
     * @param {PushCompletedEvent} event Push completed event
     */
    public sendCompleted(uid: string, event: PushCompletedEvent): void {
        this._namespace.emit('completed', uid, event);
    }

    /**
     * Register a node as a remotely available node
     *
     * @param {Node<any, any>} node Node to register
     * @returns {boolean} Registration success
     */
    public registerNode(node: Node<any, any>): boolean {
        this._nodes.set(node.uid, node);
        this.logger('debug', {
            message: `Registered remote server node ${node.uid}`,
        });
        return true;
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
