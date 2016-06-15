import nodePath = require("path");
import {logger} from "./logger";

import {
  WorkspaceDefinition,
  WorkspaceStatus,
  RuntimeDefinition,
  RuntimeStatus,
  Provisioner } from "./api";
import {DockerodePromesied} from "./DockerodePromesied";

import {FSCopyProvisioner} from "./FSCopyProvisioner";

const PROVISIONERS = {
  fsCopy: FSCopyProvisioner
};


export class DockerodeHandler {

  private allRuntimes = new Map<string, { path: string, application: RuntimeDefinition }>();
  private dockerP: DockerodePromesied;

  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition, private docker: dockerode.Docker) {
    this.dockerP = new DockerodePromesied(docker, workspaceId);
    let services = this.workspaceDefinition.development.services;
    Object.keys(services).forEach((serviceName) => {
      this.allRuntimes.set(serviceName, { path: "development.services." + serviceName, application: services[serviceName] });
    });
    let tools = this.workspaceDefinition.development.tools;
    Object.keys(tools).forEach((toolName) => {
      this.allRuntimes.set(toolName, { path: "development.tools." + toolName, application: tools[toolName] });
    });

  }

  public async start(teamNetwork: dockerode.Network, progress?: (string) => any) {
    progress && progress(`[ ${this.workspaceId} ] starting`);
    try {
      let workspaceCreated = false;
      if (!this.workspaceDefinition.development.code.bindToHostPath) {
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
      if(!workspaceCreated) {
        await this.runProvisioning(progress);
      }

      logger.info("[ %s ] workspace started", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ] error starting workspace", this.workspaceId, error);
      throw error;
    }
  }

  public async status() {
    let containers = await this.listWorkspaceContainers();
    if (containers.length === 0) {
      logger.error("[ %s ] workspace does not exist", this.workspaceId);
      throw new Error("workspace does not exist");
    }
    try {
      let status: WorkspaceStatus = {
        workspaceId: this.workspaceId,
        runtimes: {}
      };
      containers.forEach((containerInfo) => {
        let runtimeDefinition = this.getRuntimeDefinitionByPath(containerInfo);
        let networkSettings = containerInfo.NetworkSettings;
        let runtimeStatus: RuntimeStatus = status.runtimes[containerInfo.Labels["workspace.application.path"]] = {
          status: containerInfo.Status,
          type: runtimeDefinition.type,
          network: {
            ip: networkSettings.Networks[this.workspaceId].IPAddress,
            port: runtimeDefinition.port,
            additional: {}
          },
          definition: runtimeDefinition
        };
        Object.keys(networkSettings.Networks).forEach((networkName) => {
          let network = networkSettings.Networks[networkName];
          if (networkName != this.workspaceId) {
            runtimeStatus.network.additional[networkName] = network.IPAddress;
          }
        });
      });
      return status;
    } catch (error) {
      logger.error("[ %s ] error getting status", this.workspaceId, error);
      throw error;
    }
  }

  public async delete(progress?: (string) => any) {
    try {
      let containers = await this.listWorkspaceContainers();
      await Promise.all(containers.map((container) => this.removeContainer(container)));
      await this.removeWorkspaceNetwork();
      progress && progress(`[ ${this.workspaceId} ] workspace deleted`);
      logger.info("[ %s ] workspace deleted", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ] error deleting workspace", this.workspaceId, error);
      throw error;
    }
  }


  public async startRuntime(name: string, path: string, app: RuntimeDefinition,
    teamNetwork: dockerode.Network, progress?: (string) => any) {
    // await this.pull(app.image, progress);
    const containerName = name + "." + this.workspaceId;
    const commandArray = app.command && ["bash", "-c", app.command];
    const containerImage = app.image || this.workspaceDefinition.development.image;
    const code = this.workspaceDefinition.development.code;
    const bindCodeTo = code.bindToHostPath ? nodePath.resolve(code.bindToHostPath) : this.workspaceId;

    const containerOptions: dockerode.CreateContainerReq = {
      name: containerName,
      Hostname: name,
      Domainname: this.workspaceId,
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
      }
    };
    if (app.port) {
      let port = app.port + "/tcp";
      containerOptions.ExposedPorts = {};
      containerOptions.ExposedPorts[port] = {};
    }
    this.allRuntimes.forEach((runtime) => {
      let otherRuntime = runtime.path.split(".").slice(-1)[0];
      let linkName = `${otherRuntime}.${this.workspaceId}`;
      if (linkName != containerName) {
        containerOptions.HostConfig.Links.push(`${linkName}:${otherRuntime}`);
      }
    });
    let container = await this.dockerP.createContainer(containerOptions);
    progress && progress(`[ ${this.workspaceId} ] starting '${name}'`);
    await this.dockerP.startContainer(container);
    await this.dockerP.connectContainerToNetwork(container.id, teamNetwork);
    logger.debug("[ %s ] started '%s' ", this.workspaceId, name);
  }

  private createWorkspaceNetwork() {
    let networkSettings: dockerode.NetworkParameters = {
      Name: this.workspaceId,
      CheckDuplicate: true,
      Labels: {
        "workspace": "true",
        "workspace.id": this.workspaceId,
        "workspace.team": this.workspaceDefinition.team
      }
    };
    return this.dockerP.createNetwork(networkSettings);
  }

  private removeWorkspaceNetwork() {
    let network = this.docker.getNetwork(this.workspaceId);
    return this.dockerP.removeNetwork(network);
  }

  private async createWorkspaceVolume() {
    const volumes = await this.dockerP.listVolumes();
    const workspaceVolumeExists = volumes.Volumes.some(volume => volume.Name === this.workspaceId);
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
    await this.dockerP.createVolume(volumeOptions);
    return true;
  }

  private async runProvisioning(progress: (string) => void) {
    logger.debug("[ %s ] starting provision : ", this.workspaceId);
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

  private removeContainer(containerInfo: dockerode.ContainerInfo) {
    logger.debug("[ %s ] removing container : ", this.workspaceId, containerInfo.Names);
    let container = this.docker.getContainer(containerInfo.Id);
    return this.dockerP.removeContainer(container, { force: true });
  }

  private listWorkspaceContainers() {
    return this.dockerP.listContainers({
      all: true,
      filters: { label: [`workspace.id=${this.workspaceId}`] }
    });
  }

  private getRuntimeDefinitionByPath(containerInfo: dockerode.ContainerInfo): RuntimeDefinition {
    let path = containerInfo.Labels["workspace.application.path"];
    let lastNode = this.workspaceDefinition as any;
    path.split(".").forEach(node => {
      lastNode = lastNode[node];
    });
    return lastNode;
  }

}
