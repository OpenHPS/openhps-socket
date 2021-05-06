import * as http from 'http';
import * as https from 'https';
import * as io from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

/**
 * @category Server
 */
export class ServerOptions {
    public path = '/';
    public srv: http.Server | https.Server | io.Server;
    public middleware?: Array<(socket: io.Socket, next: (err?: ExtendedError) => void) => void> = [];
}
