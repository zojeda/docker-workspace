import path = require("path");
import winston = require("winston");


import {loggerFactory} from "../logger";
import * as util from '../utils';
import {docker} from "../docker";
import {RuntimeDefinition, RuntimeImage, Volume, BuildImageDefinition} from "../api";

var streamToPromise = require("stream-to-promise")

export class Runtime {
    //definition.image: default to this.workspaceDefinition.development.image
    constructor(
        private workspaceId: string,
        private name: string,
        private runtimePath,
        private definition: RuntimeDefinition) {
    }
    async start(
        bindings: Volume[],
        groupNetwork: dockerode.Network,
        allRuntimes: Map<string, { path: string, application: RuntimeDefinition }>,
        output: NodeJS.WritableStream) {
        const logger = loggerFactory(this.workspaceId, output);
        logger.debug("starting '%s'", this.name);
        // await this.pull(this.definition.image, progress);
        const containerName = this.name + "." + this.workspaceId;
        const commandArray = this.definition.command.split(/\s/);
        const imageDefinition = this.definition.image;
        const containerImage = await this.getContainerImage(output, logger, imageDefinition);
        const containerOptions: dockerode.CreateContainerOptions = {
            name: containerName,
            Hostname: this.name,
            Image: containerImage,
            Tty: false,
            Labels: {
                "workspace": "true",
                "workspace.id": this.workspaceId,
                "workspace.application.name": this.name,
                "workspace.application.path": this.runtimePath,
            },
            Cmd: commandArray,
            HostConfig: {
                NetworkMode: this.workspaceId,
                Links: [],
                Binds: []
            },
            NetworkingConfig: {
                EndpointsConfig: {}
            }
        };
        bindings.forEach(volume => {
            //FIXME : volume is not only for code volume
            const bindCodeTo = volume.bindToHostPath ? path.resolve(volume.bindToHostPath) : `${this.workspaceId}.code`;
            containerOptions.HostConfig.Binds.push(bindCodeTo + ":" + volume.path)
        })
        if (this.definition.port) {
            let port = this.definition.port + "/tcp";
            containerOptions.ExposedPorts = {};
            containerOptions.ExposedPorts[port] = {};
        }
        containerOptions.NetworkingConfig.EndpointsConfig[this.workspaceId] = {
            Aliases: [this.name]
        };
        allRuntimes.forEach((runtime) => {
            let otherRuntime = runtime.path.split(".").slice(-1)[0];
            let linkName = `${otherRuntime}.${this.workspaceId}`;
            if (linkName != containerName) {
                containerOptions.HostConfig.Links.push(`${linkName}:${otherRuntime}`);
            }
        });
        logger.debug("creating container '%s'", this.name, containerOptions);
        let containerInfo = await docker.createContainer(containerOptions);
        logger.debug("created container '%s'", this.name);
        let container = docker.getContainer(containerInfo.id)
        logger.debug("starting '%s'", this.name);
        await container.start();
        // await groupNetwork.connect({ Container: container.id });
        logger.info("started '%s' ", this.name);
    }



    private async getContainerImage(output: NodeJS.WritableStream, logger: winston.LoggerInstance, imageDefinition: RuntimeImage) {
        logger.debug("getting container image '%s'", this.name);

        if (typeof imageDefinition === "string") {
            // pull the image
            const imageName = imageDefinition.indexOf(':') != -1 ? imageDefinition : imageDefinition + ':latest';
            const pullStream = await docker.pull(imageName);
            util.progressBars(pullStream, process.stdout);
            await streamToPromise(pullStream);
            return imageDefinition;
        }
        // build the image
        const buildImage = imageDefinition as BuildImageDefinition;
        const buildImageTar = await util.createTempTarFromPath(buildImage.build, 'build-' + buildImage.name, output);
        const tarHash = await util.md5(buildImageTar);

        const builtImageInfo = await docker.listImages({ filters: { label: [`workspace.build.md5=${tarHash}`, "workspace=true"] } });
        if (builtImageInfo.length > 0) {
            logger.debug("using built image '%s' ", buildImage.name);
            return buildImage.name;
        }
        const buildStream = await docker.buildImage(buildImageTar, {
            t: buildImage.name,
            pull: true,
            labels: {
                "workspace": "true",
                "workspace.build.md5": tarHash
            }
        }
        );
        util.progressBars(buildStream, process.stdout);
        await streamToPromise(buildStream);
        return buildImage.name;
    }

    public static async removeAll(workspaceId: string, output: NodeJS.WritableStream) {
        const logger = loggerFactory(workspaceId, output);
        let containers = await docker.listContainers({
            all: true,
            filters: { label: [`workspace.id=${workspaceId}`] }
        });
        await Promise.all(containers.map((container) => Runtime.removeContainer(logger, container)));

    }
    private static async removeContainer(logger: winston.LoggerInstance, containerInfo: dockerode.ContainerInfo) {
        logger.debug("removing container : '%s'", containerInfo.Names);
        let container = docker.getContainer(containerInfo.Id);
        return container.remove({ force: true });
    }

}
