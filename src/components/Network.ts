import winston = require("winston");


import {loggerFactory} from "../logger";
import * as util from '../utils';
import {docker} from "../docker";


export class Network {

    constructor(
        private workspaceId: string
    ){}

    public async start(output: NodeJS.WritableStream) {
        const logger = loggerFactory(this.workspaceId+'.network', output);
        logger.debug("starting ");
        return docker.createNetwork({Name: this.workspaceId})
    }
}