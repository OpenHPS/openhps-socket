import { DataFrame, RemoteSourceNode, SourceNodeOptions } from '@openhps/core';
import { SocketServer } from '../../service';
import { SocketServerNode } from '../SocketServerNode';

/**
 * @category Server
 */
export class SocketServerSource<Out extends DataFrame> extends RemoteSourceNode<Out, SocketServer> {
    constructor(options?: SourceNodeOptions) {
        super(options);
        this.remoteNode = new SocketServerNode(options);
    }
}
