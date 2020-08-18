import { Service, DataSerializer, DataFrame, Node } from "@openhps/core";
import * as io from 'socket.io';
import * as http from 'http';
import * as https from 'https';
import { ServerOptions } from "../nodes/ServerOptions";

/**
 * Socket server
 * 
 * @category Server
 */
export class SocketServer extends Service {
    private _server: io.Server;
    private _namespace: io.Namespace;
    private _clients: io.Socket[] = new Array();
    private _options: ServerOptions;
    private _nodes: Map<string, Node<any, any>> = new Map();

    constructor(options?: ServerOptions) {
        super();
        const defaultOptions = new ServerOptions();
        // tslint:disable-next-line
        this._options = Object.assign(defaultOptions, options);

        this.once('build', this._onBuild.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            switch (this._options.srv.constructor) {
                case http.Server:
                case https.Server:
                    this._server = io(this._options.srv as http.Server | https.Server, {
                        transports: ['polling', 'websocket']
                    });
                    this.logger('debug', {
                        message: 'Socket server opened!'
                    });
                    break;
                default:
                    this._server = this._options.srv as io.Server;
                    break;
            }
            
            this._namespace = this._server.of(this._options.path);
            this._namespace.on('connection', this._onConnect.bind(this));
            this.logger('debug', {
                message: 'Socket namespace created!',
                path: this._options.path
            });
            resolve();
        });
    }

    private _onDestroy(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
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
        socket.on('push', this._onPush.bind(this));
        socket.on('pull', this._onPull.bind(this));
        socket.once('disconnect', this._onDisconnect.bind(this));
    }

    private _onDisconnect(socket: io.Socket): void {
        this._clients.splice(this._clients.indexOf(socket), 1);
        this.logger('debug', {
            message: 'Client socket connection closed!',
        });
    }

    private _onPush(uid: string, serializedFrame: any): void {
        if (this._nodes.has(uid)) {
            // Parse frame and options
            const frameDeserialized = DataSerializer.deserialize(serializedFrame);
            this._nodes.get(uid).emit('localpush', frameDeserialized);
        }
    }

    private _onPull(uid: string): void {
        if (this._nodes.has(uid)) {
            this._nodes.get(uid).emit('localpull');
        }
    }

    public push<T extends DataFrame | DataFrame[]>(uid: string, frame: T): void {
        this._namespace.emit('push', uid, DataSerializer.serialize(frame));
    }

    public pull(uid: string): void {
        this._namespace.emit('pull', uid);
    }

    public registerNode(node: Node<any, any>): boolean {
        this._nodes.set(node.uid, node);
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
