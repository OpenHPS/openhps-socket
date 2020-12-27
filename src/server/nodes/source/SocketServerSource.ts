import { DataFrame, SourceNode, EdgeBuilder, ModelBuilder, SourceNodeOptions } from '@openhps/core';
import { SocketServerNode } from '../SocketServerNode';

export class SocketServerSource<Out extends DataFrame> extends SourceNode<Out> {
    private _remoteNode: SocketServerNode<Out, Out>;

    constructor(options?: SourceNodeOptions) {
        super(options);
        this._remoteNode = new SocketServerNode<Out, Out>(options);

        this.once('build', this._onRemoteBuild.bind(this));
    }

    private _onRemoteBuild(graphBuilder: ModelBuilder<any, any>): Promise<boolean> {
        // Add a remote node before this node
        this._remoteNode.graph = this.graph;
        this._remoteNode.logger = this.logger;
        graphBuilder.addNode(this._remoteNode);
        graphBuilder.addEdge(EdgeBuilder.create().from(this._remoteNode).to(this).build());
        return this._remoteNode.emitAsync('build', graphBuilder);
    }

    public onPull(): Promise<Out> {
        return new Promise((resolve, reject) => {
            this._remoteNode
                .pull()
                .then(() => {
                    resolve(undefined);
                })
                .catch(reject);
        });
    }
}
