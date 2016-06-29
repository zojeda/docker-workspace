import nodePath = require("path");
import {logger} from "./logger";

import {
  WorkspaceDefinition,
  WorkspaceStatus,
  RuntimeDefinition,
  RuntimeStatus,
  RuntimeImage,
  BuildImageDefinition
} from "./api";

import * as util from './utils';

import { Provisioner} from "./Provisioner";
import {FSCopyProvisioner} from "./FSCopyProvisioner";

var streamToPromise = require("stream-to-promise")


const PROVISIONERS = {
  fsCopy: FSCopyProvisioner
};


export class WorkspaceStarter {

  private allRuntimes = new Map<string, { path: string, application: RuntimeDefinition }>();

  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition, private docker: dockerode.Docker) {
    let services = this.workspaceDefinition.development.services || {};
    Object.keys(services).forEach((serviceName) => {
      this.allRuntimes.set(serviceName, { path: "development.services." + serviceName, application: services[serviceName] });
    });
    let tools = this.workspaceDefinition.development.tools || {};
    Object.keys(tools).forEach((toolName) => {
      this.allRuntimes.set(toolName, { path: "development.tools." + toolName, application: tools[toolName] });
    });

  }

  public async start(teamNetwork: dockerode.Network, progress?: (string) => any) {
    console.log("starting");
    progress && progress(`[ ${this.workspaceId} ] starting`);
    try {
      let workspaceCreated = false;
      if (!this.workspaceDefinition.development.code.bindToHostPath) {
        console.log("creating volume");
        progress && progress(`[ ${this.workspaceId} ] creating volume`);
        workspaceCreated = await this.createWorkspaceVolume();
      }
      progress && progress(`[ ${this.workspaceId} ] creating network`);
      await this.createWorkspaceNetwork();

      let allstarts = Array.from(this.allRuntimes.keys()).map((name) => {
        let definition = this.allRuntimes.get(name);
        return this.startRuntime(name, definition.path, definition.application, teamNetwork, progress);
      });
      await Promise.all(allstarts);

      // only running provision if the workspace volume was just created
      // reusing existing one otherwise
      if(workspaceCreated) {
        await this.runProvisioning(progress);
      }

      logger.info("[ %s ] workspace started", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ] error starting workspace", this.workspaceId, error);
      throw error;
    }
  }



  public async startRuntime(name: string, path: string, app: RuntimeDefinition,
    teamNetwork: dockerode.Network, progress?: (string) => any) {
    // await this.pull(app.image, progress);
    const containerName = name + "." + this.workspaceId;
    const commandArray = app.command && ["bash", "-c", app.command];
    const imageDefinition = app.image || this.workspaceDefinition.development.image;
    const code = this.workspaceDefinition.development.code;
    const bindCodeTo = code.bindToHostPath ? nodePath.resolve(code.bindToHostPath) : this.workspaceId;
    const containerImage = await this.getContainerImage(imageDefinition);
    const containerOptions: dockerode.CreateContainerOptions = {
      name: containerName,
      Hostname: name,
      Image: containerImage,
      Tty: false,
      Labels: {
        "workspace": "true",
        "workspace.id": this.workspaceId,
        "workspace.application.name": name,
        "workspace.application.path": path,
      },
      Cmd: commandArray,
      HostConfig: {
        NetworkMode: this.workspaceId,
        Links: [],
        Binds: [bindCodeTo + ":" + this.workspaceDefinition.development.code.path]
      },
      NetworkingConfig: {
        EndpointsConfig: {}
      }
    };
    if (app.port) {
      let port = app.port + "/tcp";
      containerOptions.ExposedPorts = {};
      containerOptions.ExposedPorts[port] = {};
    }
    containerOptions.NetworkingConfig.EndpointsConfig[this.workspaceId] = {
      Aliases: [name]
    };
    this.allRuntimes.forEach((runtime) => {
      let otherRuntime = runtime.path.split(".").slice(-1)[0];
      let linkName = `${otherRuntime}.${this.workspaceId}`;
      if (linkName != containerName) {
        containerOptions.HostConfig.Links.push(`${linkName}:${otherRuntime}`);
      }
    });
    let containerInfo = await this.docker.createContainer(containerOptions);
    let container = this.docker.getContainer(containerInfo.id)
    progress && progress(`[ ${this.workspaceId} ] starting '${name}'`);
    await container.start();
    await teamNetwork.connect({Container: container.id});
    logger.debug("[ %s ] started '%s' ", this.workspaceId, name);
  }

  private async getContainerImage(imageDefinition: RuntimeImage ) {

    if (typeof imageDefinition === "string") {
      // pull the image
      const imageName = imageDefinition.indexOf(':') != -1 ? imageDefinition : imageDefinition+':latest';
      const pullStream = await this.docker.pull(imageName);
      util.progressBars(pullStream, process.stdout);
      await streamToPromise(pullStream);
      return imageDefinition;
    }
    // build the image
    const buildImage = imageDefinition as BuildImageDefinition;
    const buildImageTar = await util.createTempTarFromPath(buildImage.build, 'build-'+buildImage.name);
    const tarHash = await util.md5(buildImageTar);

    const builtImageInfo = await this.docker.listImages({filters: {label: [`workspace.build.md5=${tarHash}`, "workspace=true"]}});
    if (builtImageInfo.length > 0) {
      logger.debug("[ %s ] using built image '%s' ", this.workspaceId, buildImage.name);
      return buildImage.name;
    }
    const buildStream = await this.docker.buildImage(buildImageTar, {
      t: buildImage.name,
      pull: true,
      labels: {
        "workspace": "true",
        "workspace.build.md5": tarHash        
      }}
    );
    util.progressBars(buildStream, process.stdout);
    await streamToPromise(buildStream);
    return buildImage.name;
  }

  private createWorkspaceNetwork() {
    let networkSettings: dockerode.CreateNetworkOptions = {
      Name: this.workspaceId,
      CheckDuplicate: true,
      Labels: {
        "workspace": "true",
        "workspace.id": this.workspaceId,
        "workspace.definition": JSON.stringify(this.workspaceDefinition),
        "workspace.team": this.workspaceDefinition.team
      }
    };
    return this.docker.createNetwork(networkSettings);
  }


  private async createWorkspaceVolume() {
    const volumes = await this.docker.listVolumes();
    const workspaceVolumeExists = volumes.Volumes && volumes.Volumes.some(volume => volume.Name === this.workspaceId);
    if(workspaceVolumeExists) {
      logger.info("[ %s ] using existing volume ", this.workspaceId);
      return false;
    }
    let volumeOptions: dockerode.CreateVolumeOptions = {
      Name: this.workspaceId,
      Labels: {
        "workspace": "true",
        "workspace.id": this.workspaceId,
        "workspace.team": this.workspaceDefinition.team
      }
    };

    logger.info("[ %s ] creating a new volume", this.workspaceId);
    await this.docker.createVolume(volumeOptions);
    return true;
  }

  private async runProvisioning(progress: (string) => void) {
    logger.info("[ %s ] starting provision ", this.workspaceId);
    let provisions = this.workspaceDefinition.development.code.provisions;
    if (provisions && provisions.length > 0) {
      // pick the first container and perform the provision using it
      let containersInfo = await this.listWorkspaceContainers();
      if (containersInfo[0]) {
        for (let provisionerItem of provisions) {
          let ProvisionerClass = PROVISIONERS[provisionerItem.name];
          let provisioner: Provisioner = new ProvisionerClass(provisionerItem.params);
          logger.debug("[ %s ] running '%s' provision", this.workspaceId, provisionerItem.name);
          await provisioner.addContent(this.workspaceId, this.workspaceDefinition,
            this.docker.getContainer(containersInfo[0].Id), progress);
        }
      }
    }
  }

  private async listWorkspaceContainers() {
    // return await this.docker.listContainers({
    //   all: true,
    //   filters: { label: [`workspace.id=${this.workspaceId}`] }
    // });
    return await this.docker.listContainers({
      all: true,
      filters: { label: [`workspace.id=${this.workspaceId}`] }
    });    
  }



}
