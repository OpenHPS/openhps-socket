import { DataFrame, SinkNode, ModelBuilder, SinkNodeOptions, EdgeBuilder } from '@openhps/core';
import { SocketClientNode } from '../SocketClientNode';

export class SocketClientSink<In extends DataFrame> extends SinkNode<In> {
    private _remoteNode: SocketClientNode<In, In>;

    constructor(options?: SinkNodeOptions) {
        super(options);
        this._remoteNode = new SocketClientNode<In, In>(options);

        this.once('build', this._onRemoteBuild.bind(this));
        this.once('destroy', this._onRemoteDestroy.bind(this));
    }

    private _onRemoteBuild(graphBuilder: ModelBuilder<any, any>): Promise<boolean> {
        this._remoteNode.graph = this.graph;
        this._remoteNode.logger = this.logger;
        graphBuilder.addNode(this._remoteNode);
        graphBuilder.addEdge(EdgeBuilder.create().from(this._remoteNode).to(this).build());
        graphBuilder.addEdge(EdgeBuilder.create().from(this).to(this._remoteNode).build());
        return this._remoteNode.emitAsync('build', graphBuilder);
    }

    private _onRemoteDestroy(): Promise<boolean> {
        return this._remoteNode.emitAsync('destroy');
    }

    public onPush(data: In | In[]): Promise<void> {
        return this._remoteNode.push(data);
    }
}
