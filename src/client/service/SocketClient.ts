import { DataFrame, DataSerializer, PushOptions, PullOptions, RemoteService } from '@openhps/core';
import * as io from 'socket.io-client';
import { ClientOptions } from '../nodes/ClientOptions';

/**
 * Socket client
 */
export class SocketClient extends RemoteService {
    private _client: io.Socket;
    private _options: ClientOptions;

    constructor(options?: ClientOptions) {
        super();
        this._options = options;

        this.once('build', this._onInit.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    private _onInit(): Promise<void> {
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

            this._client = io.io(`${options.url}${options.path}`, {
                autoConnect: false,
                timeout: options.timeout,
                transports: options.transports,
                rejectUnauthorized: options.rejectUnauthorized,
                reconnectionAttempts: options.reconnectionAttempts,
                auth: options.auth,
            });

            const timeout = setTimeout(() => {
                this.logger('error', {
                    message: 'Unexpected timeout occurred while connecting!',
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
            this._client.on('push', (uid: string, frame: any, options: any) => {
                this.localPush(uid, frame, options);
            });
            this._client.on('pull', (uid: string, options: any) => {
                this.localPull(uid, options);
            });
            this._client.on('event', (uid: string, event: string, ...args: any[]) => {
                this.localEvent(uid, event, ...args);
            });
            this._client.on('service', (uuid: string, uid: string, method: string, ...args: any[]) => {
                Promise.resolve(this.localServiceCall(uid, method, ...args))
                    .then((result) => {
                        this._client.emit('service-resolve', uuid, DataSerializer.serialize(result));
                    })
                    .catch((ex) => {
                        this._client.emit('service-reject', uuid, ex);
                    });
            });
            this._client.on('service-resolve', (uuid: string, result: any) => {
                this.promises.get(uuid).resolve(result);
                this.promises.delete(uuid);
            });
            this._client.on('service-reject', (uuid: string, result: any) => {
                this.promises.get(uuid).reject(result);
                this.promises.delete(uuid);
            });
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

    public remoteEvent(uid: string, event: string, ...args: any[]): Promise<void> {
        return new Promise((resolve) => {
            if (this._client) this._client.emit('event', uid, event, ...args);
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

    public remoteServiceCall(uid: string, method: string, ...args: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            const uuid = this.generateUUID();
            if (this._client) this._client.emit('service', uuid, uid, method, ...args);
            this.promises.set(uuid, { resolve, reject });
        });
    }

    /**
     * Get the socket client identifier
     *
     * @returns {string} client socket identifier
     */
    get clientId(): string {
        return this._client.id;
    }
}
