import { DataFrame, SinkNode, ModelBuilder, SinkNodeOptions, PushOptions, Edge } from '@openhps/core';
import { SocketServerNode } from '../SocketServerNode';

/**
 * @category Server
 */
export class SocketServerSink<In extends DataFrame> extends SinkNode<In> {
    private _remoteNode: SocketServerNode<In, In>;

    constructor(options?: SinkNodeOptions) {
        super(options);
        this._remoteNode = new SocketServerNode<In, In>(options);
        this.once('build', this._onRemoteBuild.bind(this));
    }

    private _onRemoteBuild(graphBuilder: ModelBuilder<any, any>): Promise<boolean> {
        // Add a remote node after this node
        this._remoteNode.graph = this.graph;
        this._remoteNode.logger = this.logger;
        graphBuilder.addNode(this._remoteNode);
        graphBuilder.addEdge(new Edge(this, this._remoteNode));
        return this._remoteNode.emitAsync('build', graphBuilder);
    }

    public onPush(data: In | In[], options?: PushOptions): Promise<void> {
        return this._remoteNode.push(data, options);
    }
}
