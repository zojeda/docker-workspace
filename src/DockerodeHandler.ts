import Docker = require("dockerode");
import winston = require("winston");

class DockerodeHandler {
  docker: Docker;
  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition) {
    this.docker = new Docker();
  }

  public async start(progress? : (string) => any) {
    try {
      let network = await this.createNetwork();
      let services = this.workspaceDefinition.development.services;
      Object.keys(services).forEach((serviceName) => {
        this.runApplication(serviceName, services[serviceName], progress);
      });
      let tools = this.workspaceDefinition.development.tools;
      Object.keys(tools).forEach((toolName) => {
        this.runApplication(toolName, tools[toolName], progress);
      });
    } catch (error) {
      winston.error(error);
    }
  }

  public stop(response: Response<string, string>) {
    // do nothing
  }

  public status(response: Response<string, string>) {
    // do nothing
  }

  public async runApplication(name: string, app: ApplicationDefinition, progress? : (string) => any) {
    try {
      // await this.pull(app.image, progress);
      let created = await this.startContainer(name, app.image, app.command, progress);
      winston.debug("created : " + JSON.stringify(created, null, 2));
    } catch (e) {
      winston.error("error : ", e);
    }
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

  private async startContainer(name: string, image: string, command?: string, progress?: (message: string) => any) {
    let containerName = this.workspaceId + "_" + name;
    return new Promise<any>((resolve, reject) => {
    let commandArray = command && ["bash", "-c", command];
    let containerImage = image || this.workspaceDefinition.development.image;
    this.docker.run(containerImage,
      commandArray,
      [process.stdout, process.stderr],
      {
      Tty:false,
      name: containerName,
      Labels: {
          "docker-workspace": "true"
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
          "docker-workspace": "true"
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

export = DockerodeHandler;