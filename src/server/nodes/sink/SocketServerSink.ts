import { DataFrame, RemoteSinkNode, RemoteSinkNodeOptions } from '@openhps/core';
import { SocketServer } from '../../service';
import { SocketServerNode } from '../SocketServerNode';

/**
 * @category Server
 */
export class SocketServerSink<In extends DataFrame> extends RemoteSinkNode<In, SocketServer> {
    constructor(options?: SocketSinkNodeOptions) {
        super(options);
        this.remoteNode = new SocketServerNode(options);
    }
}

export interface SocketSinkNodeOptions extends RemoteSinkNodeOptions<SocketServer> {
    /**
     * Broadcast the pushed data frames to all clients
     * @default true
     */
    broadcast?: boolean;
}
