import { DataFrame, RemoteSinkNode, RemoteSinkNodeOptions } from '@openhps/core';
import { SocketClient } from '../../service';
import { SocketClientNode } from '../SocketClientNode';

/**
 * @category Client
 */
export class SocketClientSink<In extends DataFrame> extends RemoteSinkNode<In, SocketClient> {
    constructor(options?: RemoteSinkNodeOptions<SocketClient>) {
        super(options);
        this.remoteNode = new SocketClientNode(options);
    }
}
