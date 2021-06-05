import { DataFrame, RemoteSinkNode, SinkNodeOptions } from '@openhps/core';
import { SocketServer } from '../../service';
import { SocketServerNode } from '../SocketServerNode';

/**
 * @category Server
 */
export class SocketServerSink<In extends DataFrame> extends RemoteSinkNode<In, SocketServer> {
    constructor(options?: SinkNodeOptions) {
        super(options);
        this.remoteNode = new SocketServerNode(options);
    }
}
