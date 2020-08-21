import { Service } from '@openhps/core';
import { ServerOptions } from '../nodes/ServerOptions';

export class SocketServerService extends Service {
    private _options: ServerOptions;

    constructor(options: ServerOptions) {
        super();
        this._options = options;
    }
}
