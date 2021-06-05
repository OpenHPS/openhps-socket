import { DataFrame, RemoteSourceNode, SourceNodeOptions } from '@openhps/core';
import { SocketClient } from '../../service';
import { SocketClientNode } from '../SocketClientNode';

/**
 * @category Client
 */
export class SocketClientSource<Out extends DataFrame> extends RemoteSourceNode<Out, SocketClient> {
    constructor(options?: SourceNodeOptions) {
        super(options);
        this.remoteNode = new SocketClientNode(options);
        this.on('localerror', console.log);
    }
}
