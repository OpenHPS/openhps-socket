import { Node, DataFrame, Model, NodeOptions } from "@openhps/core";
import { SocketClient } from "../service/SocketClient";

export class SocketClientNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    private _service: SocketClient;

    constructor(options?: NodeOptions) {
        super(options);

        this.once('build', this._onBuild.bind(this));
        this.on('push', this._onPush.bind(this));
        this.on('pull', this._onPull.bind(this));
        this.on('localpush', this._onLocalPush.bind(this));
        this.on('localpull', this._onLocalPull.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const model = (this.graph as Model<any, any>);
            this._service = (this.graph as Model<any, any>).findService<SocketClient>("SocketClient");
            if (this._service === undefined || this._service === null) {
                return reject(new Error(`Socket client service was not added to model!`));
            }
            this._service.registerNode(this);
            resolve();
        });
    }

    private _onPush(frame: In | In[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Send push to clients
            this._service.push(this.uid, frame);
            resolve();
        });
    }

    private _onPull(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Send pull to clients
            this._service.pull(this.uid);
            resolve();
        });
    }

    private _onLocalPush(frame: In | In[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const pushPromises = new Array();
            this.outputNodes.forEach(node => {
                pushPromises.push(node.push(frame));
            });

            Promise.all(pushPromises).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    private _onLocalPull(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const pullPromises = new Array();
            this.outputNodes.forEach(node => {
                pullPromises.push(node.pull());
            });

            Promise.all(pullPromises).then(() => {
                resolve();
            }).catch(reject);
        });
    }

}
