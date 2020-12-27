import { DataFrame, Node, Model, NodeOptions, PushOptions, PullOptions } from '@openhps/core';
import { SocketServer } from '../service';

export class SocketServerNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    private _service: SocketServer;

    constructor(options?: NodeOptions) {
        super(options);

        this.on('push', this._onPush.bind(this));
        this.on('pull', this._onPull.bind(this));
        this.on('localpush', this._onLocalPush.bind(this));
        this.on('localpull', this._onLocalPull.bind(this));
        this.once('build', this._onBuild.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._service = (this.graph as Model<any, any>).findService<SocketServer>('SocketServer');
            if (this._service === undefined || this._service === null) {
                return reject(new Error(`Socket server service was not added to model!`));
            }
            this._service.registerNode(this);
            resolve();
        });
    }

    private _onPush(frame: In | In[], options?: PushOptions): Promise<void> {
        return new Promise<void>((resolve) => {
            // Send push to clients
            this._service.push(this.uid, frame, options);
            resolve();
        });
    }

    private _onPull(options?: PullOptions): Promise<void> {
        return new Promise<void>((resolve) => {
            // Send pull to clients
            this._service.pull(this.uid, options);
            resolve();
        });
    }

    private _onLocalPush(frame: In | In[], options?: PushOptions): Promise<void> {
        return new Promise<void>((resolve) => {
            this.outlets.forEach((outlet) => outlet.push(frame as any, options));
            resolve();
        });
    }

    private _onLocalPull(options?: PullOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Promise.all(this.inlets.map((inlet) => inlet.pull()))
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }
}
