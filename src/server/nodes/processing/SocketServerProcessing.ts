import { DataFrame } from "@openhps/core";
import { SocketServerNode } from "../SocketServerNode";

export class RemoteProcessingNode<In extends DataFrame, Out extends DataFrame> extends SocketServerNode<In, Out> {

}
