import nodePath = require("path");
import Docker = require("dockerode");
import {logger} from "./logger";

import {WorkspaceDefinition, WorkspaceStatus, RuntimeDefinition} from "./api";

export class DockerodeHandler {
  private docker: dockerode.Docker;
  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition) {
    this.docker = new Docker();
  }

  public async start(progress?: (string) => any) {
    try {
      if (!this.workspaceDefinition.development.code.bindToHostPath) {
        // this.createWorkspaceVolume()
      }
      await this.createWorkspaceNetwork();
      await this.allRuntimes.forEach((definition, name) =>
        this.startRuntime(name, definition.path, definition.application));
      logger.info("[ %s ]: workspace started", this.workspaceId);
    } catch (error) {
      logger.error("[ %s ]: error starting workspace", this.workspaceId, error);
    }
  }

  public async stop(progress?: (string) => any) {
    // do nothing
  }

  public async status() {
    return new Promise<WorkspaceStatus>((resolve, reject) => {
      resolve({ definition: this.workspaceDefinition });
    });
  }

  public async delete(progress?: (string) => any) {
    try {
      logger.info("[ %s ]: deleting workspace", this.workspaceId);

      let containers = await this.listContainers();

      let count = containers.length;
      let counter = 0;
      if (count > 0) {
        await containers.forEach((containerInfo) => {
          logger.info("[ %s ]: removing container : ", this.workspaceId, containerInfo.Names);
          this.removeContainer(containerInfo).then(() => {
            counter++;
            if (counter === count) {
              this.removeWorkspaceNetwork();
            }
          });

        });
      } else {
        this.removeWorkspaceNetwork();
      }
    } catch (error) {
      logger.error("[ %s ]: error deleting workspace", this.workspaceId, error);
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
    console.log(containerOptions.HostConfig.Links);
    let container = await createContainer(containerOptions);
    let startContainer = this.promisifyDocker("create container", container.start, { context: container });
    await startContainer();

    logger.info("[ %s ]: started '%s' ", this.workspaceId, name);
  }


  private get allRuntimes(): Map<string, { path: string, application: RuntimeDefinition }> {
    let result = new Map<string, { path: string, application: RuntimeDefinition }>();

    let services = this.workspaceDefinition.development.services;
    Object.keys(services).forEach((serviceName) => {
      result.set(serviceName, { path: "development.services." + serviceName, application: services[serviceName] });
    });
    let tools = this.workspaceDefinition.development.tools;
    Object.keys(tools).forEach((toolName) => {
      result.set(toolName, { path: "development.tools." + toolName, application: tools[toolName] });
    });
    return result;
  }


  private async pull(image: string, progress?: (message: string) => any) {
    return new Promise<string>((resolve, reject) => {
      this.docker.pull(image, (error, stream) => {
        this.docker.modem.followProgress(stream, onPullFinished, onProgress);
        function onProgress(event) {
          if (progress) {
            progress(event);
          }
        }
        function onPullFinished(error, output) {
          if (error) {
            reject(error);
          } else {
            resolve(output);
          }
        }
      });
    });
  }

  private fakeCall(message: string, progress?: (string) => any) {
    return new Promise<string>((resolve) => setTimeout(() => {
      progress(message);
      resolve(message);
    }, 300));
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
    let container = this.docker.getContainer(containerInfo.Id);
    let removeContainer = this.promisifyDocker1Arg(`removing container [${containerInfo.Names}]`, container.remove, { context: container });
    return removeContainer({ force: true });
  }

  private listContainers() {
    let listContainers = this.promisifyDocker1Arg("listing containers", this.docker.listContainers);
    return listContainers({
      filters: { label: [`workspace.id=${this.workspaceId}`] }
    });
  }

  promisifyDocker1Arg<A1, T>(message: string, method: (arg1: A1, callback: (err, response: T) => any) => any, context?: { context: any }): (arg: A1) => Promise<T> {
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
  promisifyDocker<T>(message: string, method: (callback: (err, response: T) => any) => any, context?: { context: any }): () => Promise<T> {
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

}
