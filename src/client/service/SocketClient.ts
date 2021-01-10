import { Service, DataFrame, DataSerializer, Node, PushOptions, PullOptions } from '@openhps/core';
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
        const defaultOptions = new ClientOptions();
        // tslint:disable-next-line
        this._options = Object.assign(defaultOptions, options);

        this.once('build', this._onBuild.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._client = io(`${this._options.url}${this._options.path}`, {
                autoConnect: false,
                timeout: this._options.timeout,
                transports: this._options.transports,
                rejectUnauthorized: this._options.rejectUnauthorized,
                reconnectionAttempts: this._options.reconnectionAttempts,
            });

            const timeout = setTimeout(() => {
                this.logger('error', {
                    message: 'Unexpected timeout occured while connecting!',
                    url: `${this._options.url}${this._options.path}`,
                });
                reject(new Error('Unexpected timeout occurred while connecting!'));
            }, this._options.timeout * 2);

            this._client.once('connect', () => {
                this.logger('debug', {
                    message: 'Socket connection made with server!',
                    url: `${this._options.url}${this._options.path}`,
                });
                clearTimeout(timeout);
                resolve();
            });
            this._client.once('connect_error', (err: any) => {
                this.logger('error', {
                    message: 'Socket connection failed with server!',
                    url: `${this._options.url}${this._options.path}`,
                    error: err,
                });
                clearTimeout(timeout);
                reject(err);
            });
            this._client.once('connect_timeout', (err: any) => {
                this.logger('error', {
                    message: 'Socket connection timeout!',
                    url: `${this._options.url}${this._options.path}`,
                    error: err,
                });
                clearTimeout(timeout);
                reject(new Error(`Socket connection timeout!`));
            });
            this._client.on('push', this._onPush.bind(this));
            this._client.on('pull', this._onPull.bind(this));
            this.logger('debug', {
                message: 'Connecting to socket server ...',
                url: `${this._options.url}${this._options.path}`,
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

    public push<T extends DataFrame | DataFrame[]>(uid: string, frame: T, options?: PushOptions): void {
        this._client.compress(true).emit('push', uid, DataSerializer.serialize(frame), options);
    }

    public pull(uid: string, options?: PullOptions): void {
        this._client.emit('pull', uid, options);
    }
}
