import { DataFrame, NodeOptions, RemoteNode } from '@openhps/core';
import { SocketClient } from '../service';

/**
 * @category Client
 */
export class SocketClientNode<In extends DataFrame, Out extends DataFrame> extends RemoteNode<In, Out, SocketClient> {
    constructor(options?: NodeOptions) {
        super({ service: SocketClient, ...options });
    }
}
