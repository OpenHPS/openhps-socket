import * as http from 'http';
import * as https from 'https';
import * as io from 'socket.io';

export class ServerOptions {
    public path: string = "/";
    public srv: http.Server | https.Server | io.Server;
}
