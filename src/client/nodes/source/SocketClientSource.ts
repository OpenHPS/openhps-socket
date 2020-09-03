import { DataFrame, SourceNode, EdgeBuilder, ModelBuilder, SourceNodeOptions } from '@openhps/core';
import { SocketClientNode } from '../SocketClientNode';

export class SocketClientSource<Out extends DataFrame> extends SourceNode<Out> {
    private _remoteNode: SocketClientNode<Out, Out>;

    constructor(options?: SourceNodeOptions) {
        super(null, options);
        this._remoteNode = new SocketClientNode<Out, Out>(options);

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
                    resolve();
                })
                .catch(reject);
        });
    }
}
