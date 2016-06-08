import Docker = require("dockerode");
import winston = require("winston");
import {WorkspaceDefinition, WorkspaceStatus, ApplicationDefinition} from "./api";

export class DockerodeHandler {
  private docker: Docker;
  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition) {
    this.docker = new Docker();
  }

  public async start(progress? : (string) => any) {
    try {
      await this.createNetwork();
      this.allApplications.forEach((definition, name) =>
        this.runApplication(name, definition.path, definition.application));
    } catch (error) {
      winston.error(error);
    }
  }

  public async stop(progress? : (string) => any) {
    // do nothing
  }

  public async status() {
    return new Promise<WorkspaceStatus>((resolve, reject) => {
      resolve({definition: this.workspaceDefinition});
    });
  }

  public async delete(progress? : (string) => any) {
    return new Promise<WorkspaceStatus>((resolve, reject) => {
      this.docker.listContainers({filters: {label: [`workspace.id=${this.workspaceId}`]}}, (error, containers) => {
        winston.debug("removing containers: ", error, containers);
        let count = containers.length;
        let counter = 0;
        if( count>0 ) {
          containers.forEach((containerInfo) => {
            this.docker.getContainer(containerInfo.Id).remove({v: false, force: true}, (error, removeInfo) => {
              winston.debug("container remove: ", error, removeInfo);
              if(error) {
                winston.error(error + "");
                return reject(error);
              }
              counter++;
              if (counter === count) {
                let network = this.docker.getNetwork(this.workspaceId);
                network.remove((err, result) => {
                  winston.debug("network remove: ", err, result);
                  if(error) {
                    winston.error(error + "");
                    return reject(error);
                  }
                  resolve();
                });
              }
            });
          });
        }
      });
    });
  }


  public async runApplication(name: string, path: string, app: ApplicationDefinition, progress? : (string) => any) {
    try {
      // await this.pull(app.image, progress);
      let created = await this.startContainer(name, app.image, path, app.command, progress);
      winston.debug("created : " + JSON.stringify(created, null, 2));
    } catch (e) {
      winston.error("error : ", e);
    }
  }


  private get allApplications() : Map<string, {path: string, application: ApplicationDefinition}>  {
    let result = new Map<string, {path: string, application: ApplicationDefinition}>();

    let services = this.workspaceDefinition.development.services;
    Object.keys(services).forEach((serviceName) => {
      result.set(serviceName, {path: "services", application: services[serviceName]});
    });
    let tools = this.workspaceDefinition.development.tools;
    Object.keys(tools).forEach((toolName) => {
      result.set(toolName, {path: "tools", application: tools[toolName]});
    });
    return result;
  }


  private async pull(image: string, progress?: (message: string) => any) {
    return new Promise<string>((resolve, reject) => {
      this.docker.pull(image, (error, stream) => {
        this.docker.modem.followProgress(stream, onPullFinished, onProgress);
        function onProgress(event) {
          if(progress) {
            progress(event);
          }
        }
        function onPullFinished(error, output) {
          if(error) {
            reject(error);
          } else {
            resolve(output);
          }
        }
      });
    });
  }

  private async startContainer(name: string, image: string, path: string, command?: string, progress?: (message: string) => any) {
    let containerName = this.workspaceId + "_" + name;
    return new Promise<any>((resolve, reject) => {
    let commandArray = command && ["bash", "-c", command];
    let containerImage = image || this.workspaceDefinition.development.image;
    this.docker.run(containerImage,
      commandArray,
      [],
      {
        Tty:false,
        name: containerName,
        Labels: {
            "workspace": "true",
            "workspace.id": this.workspaceId,
            "workspace.application.name": name,
            "workspace.application.path": path,
        },
        HostConfig: {NetworkMode: this.workspaceId}

      },
        (error, data, container) =>{
          if (error) {
            return reject(error);
          }
          resolve(container);
        });
      });
  }

  private fakeCall(message: string, progress?: (string) => any) {
    return new Promise<string>((resolve) => setTimeout( () => {
      progress(message);
      resolve(message);
    }, 300));
  }

  private createNetwork() {
    return new Promise<{Id: string, Warning?: string}>((resolve, reject) => {
      this.docker.createNetwork({
        Name: this.workspaceId,
        CheckDuplicate: true,
        Labels: {
          "workspace": "true",
          "workspace.id": this.workspaceId
        }}, (error, network) => {
          if (error) {
            return reject(error);
          } else {
            resolve(network);
          }
      });
    });
  }
}
