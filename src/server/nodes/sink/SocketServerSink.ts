import { DataFrame, SinkNode, ModelBuilder, SinkNodeOptions, EdgeBuilder } from '@openhps/core';
import { SocketServerNode } from '../SocketServerNode';

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
        graphBuilder.addEdge(EdgeBuilder.create().from(this).to(this._remoteNode).build());
        return this._remoteNode.emitAsync('build', graphBuilder);
    }

    public onPush(data: In | In[]): Promise<void> {
        return this._remoteNode.push(data);
    }
}
