import { DataFrame, DataSerializer, PushOptions, PullOptions, RemoteNodeService } from '@openhps/core';
import * as io from 'socket.io-client';
import { ClientOptions } from '../nodes/ClientOptions';

/**
 * Socket client
 */
export class SocketClient extends RemoteNodeService {
    private _client: SocketIOClient.Socket;
    private _options: ClientOptions;

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
            this._client.on('push', this.localPush.bind(this));
            this._client.on('pull', this.localPull.bind(this));
            this._client.on('event', this.localEvent.bind(this));
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

    public get connected(): boolean {
        if (this._client === undefined) {
            return false;
        }
        return this._client.connected;
    }

    public remoteEvent(uid: string, event: string, arg: any): Promise<void> {
        return new Promise((resolve) => {
            if (this._client) this._client.emit('event', uid, event, arg);
            resolve();
        });
    }

    public remotePush<T extends DataFrame | DataFrame[]>(uid: string, frame: T, options?: PushOptions): Promise<void> {
        return new Promise((resolve) => {
            if (this._client) this._client.compress(true).emit('push', uid, DataSerializer.serialize(frame), options);
            resolve();
        });
    }

    public remotePull(uid: string, options?: PullOptions): Promise<void> {
        return new Promise((resolve) => {
            if (this._client) this._client.emit('pull', uid, options);
            resolve();
        });
    }
}
