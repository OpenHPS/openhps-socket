import { DataFrame, NodeOptions, RemoteNode } from '@openhps/core';
import { SocketServer } from '../service';

/**
 * @category Server
 */
export class SocketServerNode<In extends DataFrame, Out extends DataFrame> extends RemoteNode<In, Out, SocketServer> {
    constructor(options?: NodeOptions) {
        super({ service: SocketServer, ...options });
    }
}
