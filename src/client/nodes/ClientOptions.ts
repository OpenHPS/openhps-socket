/**
 * @category Client
 */
export class ClientOptions {
    public url: string;
    public path: string;
    public timeout?: number = 5000;
    public transports?: string[] = ['websocket'];
    public rejectUnauthorized?: boolean = false;
    public reconnectionAttempts?: number = 5;
    public auth?: any;
}
