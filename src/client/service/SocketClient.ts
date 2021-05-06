import {
    Service,
    DataFrame,
    DataSerializer,
    Node,
    PushOptions,
    PullOptions,
    PushError,
    PushCompletedEvent,
} from '@openhps/core';
import * as io from 'socket.io-client';
import { ClientOptions } from '../nodes/ClientOptions';

/**
 * Socket client
 */
export class SocketClient extends Service {
    private _client: SocketIOClient.Socket;
    private _options: ClientOptions;
    private _nodes: Map<string, Node<any, any>> = new Map();

    constructor(options?: ClientOptions) {
        super();
        this.name = 'SocketClient';
        this._options = options;

        this.once('build', this._onBuild.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    private _onBuild(): Promise<void> {
        if (!this._options) {
            return Promise.resolve();
        }
        return this.connect(this._options);
    }

    /**
     * Connect to the socket server
     *
     * @param {ClientOptions} options Client options
     * @returns {Promise<void>} Connection promise
     */
    public connect(options: ClientOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._client && this._client.connected) {
                // Disconnect
                this._client.disconnect();
            }
            const defaultOptions = new ClientOptions();
            // tslint:disable-next-line
            options = Object.assign(defaultOptions, options);

            this._client = io(`${options.url}${options.path}`, {
                autoConnect: false,
                timeout: options.timeout,
                transports: options.transports,
                rejectUnauthorized: options.rejectUnauthorized,
                reconnectionAttempts: options.reconnectionAttempts,
                auth: options.auth,
            });

            const timeout = setTimeout(() => {
                this.logger('error', {
                    message: 'Unexpected timeout occured while connecting!',
                    url: `${options.url}${options.path}`,
                });
                reject(new Error('Unexpected timeout occurred while connecting!'));
            }, options.timeout * 2);

            this._client.once('connect', () => {
                this.logger('debug', {
                    message: 'Socket connection made with server!',
                    url: `${options.url}${options.path}`,
                });
                clearTimeout(timeout);
                resolve();
            });
            this._client.once('connect_error', (err: any) => {
                this.logger('error', {
                    message: 'Socket connection failed with server!',
                    url: `${options.url}${options.path}`,
                    error: err,
                });
                clearTimeout(timeout);
                reject(err);
            });
            this._client.once('connect_timeout', (err: any) => {
                this.logger('error', {
                    message: 'Socket connection timeout!',
                    url: `${options.url}${options.path}`,
                    error: err,
                });
                clearTimeout(timeout);
                reject(new Error(`Socket connection timeout!`));
            });
            // Client message events
            this._client.on('push', this._onPush.bind(this));
            this._client.on('pull', this._onPull.bind(this));
            this._client.on('error', this._onError.bind(this));
            this._client.on('completed', this._onCompleted.bind(this));
            // Open connection
            this.logger('debug', {
                message: 'Connecting to socket server ...',
                url: `${options.url}${options.path}`,
            });
            this._client.open();
        });
    }

    private _onDestroy(): Promise<void> {
        return new Promise<void>((resolve) => {
            this._client.close();
            resolve();
        });
    }

    private _onPush(uid: string, serializedFrame: any, options?: PushOptions): void {
        if (this._nodes.has(uid)) {
            // Parse frame and options
            const frameDeserialized = DataSerializer.deserialize(serializedFrame);
            this._nodes.get(uid).emit('localpush', frameDeserialized, options);
        }
    }

    private _onPull(uid: string, options?: PullOptions): void {
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
     * Register a remote client node
     *
     * @param {Node<any, any>} node Node to register
     * @returns {boolean} Registration success
     */
    public registerNode(node: Node<any, any>): boolean {
        this._nodes.set(node.uid, node);
        this.logger('debug', {
            message: `Registered remote client node ${node.uid}`,
        });
        return true;
    }

    public get connected(): boolean {
        if (this._client === undefined) {
            return false;
        }
        return this._client.connected;
    }

    /**
     * Send an error to a remote node
     *
     * @param {string} uid Remote Node UID
     * @param {PushError} error Push error
     */
    public sendError(uid: string, error: PushError): void {
        if (this._client) this._client.emit('error', uid, error);
    }

    /**
     * Send a completed event to a remote node
     *
     * @param {string} uid Remote Node UID
     * @param {PushCompletedEvent} error Push completed event
     * @param event
     */
    public sendCompleted(uid: string, event: PushCompletedEvent): void {
        if (this._client) this._client.emit('completed', uid, event);
    }

    public push<T extends DataFrame | DataFrame[]>(uid: string, frame: T, options?: PushOptions): void {
        if (this._client) this._client.compress(true).emit('push', uid, DataSerializer.serialize(frame), options);
    }

    public pull(uid: string, options?: PullOptions): void {
        if (this._client) this._client.emit('pull', uid, options);
    }
}
