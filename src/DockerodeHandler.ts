import nodePath = require("path");
import {logger} from "./logger";

import {WorkspaceDefinition, WorkspaceStatus, RuntimeDefinition} from "./api";

export class DockerodeHandler {

  private allRuntimes = new Map<string, { path: string, application: RuntimeDefinition }>();
  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition, private docker: dockerode.Docker) {
    let services = this.workspaceDefinition.development.services;
    Object.keys(services).forEach((serviceName) => {
      this.allRuntimes.set(serviceName, { path: "development.services." + serviceName, application: services[serviceName] });
    });
    let tools = this.workspaceDefinition.development.tools;
    Object.keys(tools).forEach((toolName) => {
      this.allRuntimes.set(toolName, { path: "development.tools." + toolName, application: tools[toolName] });
    });

  }

  public async start(progress?: (string) => any) {
    progress && progress(`[ ${this.workspaceId} ]: starting`);
    try {
      if (!this.workspaceDefinition.development.code.bindToHostPath) {
        // this.createWorkspaceVolume()
      }
      progress && progress(`[ ${this.workspaceId} ]: creating network`);
      await this.createWorkspaceNetwork();
      let allstarts = Array.from(this.allRuntimes.keys()).map((name) => {
        let definition = this.allRuntimes.get(name);
        return this.startRuntime(name, definition.path, definition.application, progress);
      });
      await Promise.all(allstarts);
      logger.info("[ %s ]: workspace started", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ]: error starting workspace", this.workspaceId, error);
      throw error;
    }
  }

  public async status() {
    let containers = await this.listWorkspaceContainers();
    if (containers.length === 0) {
      logger.error("[ %s ]: workspace does not exist", this.workspaceId);
      throw new Error("workspace does not exist");
    }
    try {
      let status: WorkspaceStatus = {
        definition: this.workspaceDefinition,
        status: {}
      };
      containers.forEach((containerInfo) => {
        let runtimeDefinition = this.getRuntimeDefinitionByPath(containerInfo);
        status.status[containerInfo.Labels["workspace.application.path"]] = {
          status: containerInfo.Status,
          type: runtimeDefinition.type,
          network: {
            ip: containerInfo.NetworkSettings.Networks[this.workspaceId].IPAddress,
            port: runtimeDefinition.port
          },
          definition: runtimeDefinition
        }; //containerInfo.Ports;
      });
      return status;
    } catch (error) {
      logger.error("[ %s ]: error getting status", this.workspaceId, error);
      throw error;
    }
  }

  public async delete(progress?: (string) => any) {
    try {
      let containers = await this.listWorkspaceContainers();
      await Promise.all(containers.map((container) => this.removeContainer(container)));
      await this.removeWorkspaceNetwork();
      progress(`[ ${this.workspaceId} ]: workspace deleted`);
      logger.info("[ %s ]: workspace deleted", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ]: error deleting workspace", this.workspaceId, error);
      throw error;
    }
  }


  public async startRuntime(name: string, path: string, app: RuntimeDefinition, progress?: (string) => any) {
    // await this.pull(app.image, progress);
    let containerName = name + "." + this.workspaceId;
    let commandArray = app.command && ["bash", "-c", app.command];
    let containerImage = app.image || this.workspaceDefinition.development.image;
    let createContainer = this.promisifyDocker1Arg("create container", this.docker.createContainer);
    let bindCodeTo = this.workspaceDefinition.development.code.bindToHostPath || this.workspaceId;

    let containerOptions: dockerode.CreateContainerReq = {
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
        Binds: [nodePath.resolve(bindCodeTo) + ":" + this.workspaceDefinition.development.code.path]
      }
    };
    this.allRuntimes.forEach((runtime) => {
      let otherRuntime = runtime.path.split(".").slice(-1)[0];
      let linkName = `${otherRuntime}.${this.workspaceId}`;
      if (linkName != containerName) {
        containerOptions.HostConfig.Links.push(`${linkName}:${otherRuntime}`);
      }
    });
    let container = await createContainer(containerOptions);
    let startContainer = this.promisifyDocker("create container", container.start, { context: container });
    progress && progress(`[ ${this.workspaceId} ]: starting '${name}'`);
    await startContainer();

    logger.debug("[ %s ]: started '%s' ", this.workspaceId, name);
  }

  private createWorkspaceNetwork() {
    let networkSettings: dockerode.NetworkParameters = {
      Name: this.workspaceId,
      CheckDuplicate: true,
      Labels: {
        "workspace": "true",
        "workspace.id": this.workspaceId
      }
    };
    let createNetwork = this.promisifyDocker1Arg("creating network", this.docker.createNetwork);
    return createNetwork(networkSettings);
  }

  private removeWorkspaceNetwork() {
    let network = this.docker.getNetwork(this.workspaceId);
    let removeNetwork = this.promisifyDocker("removing network", network.remove, { context: network });
    return removeNetwork();
  }

  private removeContainer(containerInfo: dockerode.ContainerInfo) {
    logger.info("[ %s ]: removing container : ", this.workspaceId, containerInfo.Names);
    let container = this.docker.getContainer(containerInfo.Id);
    let removeContainer = this.promisifyDocker1Arg(`removing container [${containerInfo.Names}]`, container.remove, { context: container });
    return removeContainer({ force: true });
  }

  private listWorkspaceContainers() {
    return this.listContainers({
      all: true,
      filters: { label: [`workspace.id=${this.workspaceId}`] }
    });
  }



  //-------------------   utility methods to promisify docker calls   --------------------//
  // TODO: move this to its own reusable module
  private listContainers = this.promisifyDocker1Arg("listing containers", this.docker.listContainers);
  private listNetworks = this.promisifyDocker1Arg("listing networks", this.docker.listNetworks);

  private promisifyDocker1Arg<A1, T>(message: string, method: (arg1: A1, callback: (err, response: T) => any) => any, context?: { context: any }): (arg: A1) => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return (arg: A1) => {
      return new Promise<T>((resolve, reject) => {
        method.call(contextCall, arg, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.workspaceId, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.workspaceId, message, result);
          resolve(result);
        });
      });
    };
  }
  private promisifyDocker<T>(message: string, method: (callback: (err, response: T) => any) => any, context?: { context: any }): () => Promise<T> {
    let contextCall = context ? context.context : this.docker;
    return () => {
      return new Promise<T>((resolve, reject) => {
        method.call(contextCall, (error, result) => {
          if (error) {
            logger.error("[ %s ] %s ", this.workspaceId, message, error);
            return reject(error);
          }
          logger.debug("[ %s ]: '%s' result - ", this.workspaceId, message, result);
          resolve(result);
        });
      });
    };
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
