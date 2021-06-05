import { DataFrame, RemoteSinkNode, SinkNodeOptions } from '@openhps/core';
import { SocketClient } from '../../service';
import { SocketClientNode } from '../SocketClientNode';

/**
 * @category Client
 */
export class SocketClientSink<In extends DataFrame> extends RemoteSinkNode<In, SocketClient> {
    constructor(options?: SinkNodeOptions) {
        super(options);
        this.remoteNode = new SocketClientNode(options);
    }
}
