import { DataFrame } from '@openhps/core';
import { SocketServerNode } from '../SocketServerNode';

/**
 * @category Server
 */
export class SocketServerProcessing<In extends DataFrame, Out extends DataFrame> extends SocketServerNode<In, Out> {}
