import Docker = require("dockerode");

class DockerodeHandler {
  docker: Docker;
  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition) {
    this.docker = new Docker();
  }

  public async start(progress? : (string) => any) {
    let services = this.workspaceDefinition.development.services;
    Object.keys(services).forEach((serviceName) => {
      this.runApplication(serviceName, services[serviceName], progress);
    });
  }

  public stop(response: Response<string, string>) {
    // do nothing
  }

  public status(response: Response<string, string>) {
    // do nothing
  }

  public async runApplication(name: string, app: ApplicationDefinition, progress? : (string) => any) {
    console.log("service : ", JSON.stringify(app), null, 2);
    try {
      // await this.pull(app.image, progress);
      let created = await this.startContainer(name, app.image, app.command, progress);
      console.log("created : " + JSON.stringify(created, null, 2));
    } catch (e) {
      console.log("error : ", e);
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
    console.log(" image: ", image);
    return new Promise<any>((resolve, reject) => {
      this.docker.createContainer({
        name: this.workspaceId + "_" + name,
        Image: image,
        Cmd: command
      }, (error, container) => {
        if (error) {
          return reject(error);
        }
        container.start((error) => {
            if (error) {
              return reject(error);
            }
            resolve(container);
            });
        });
    });
  }

  private fakeCall(message: string, progress?: (string) => any) {
    return new Promise<string>((resolve) => setTimeout( () => {
      progress(message);
      resolve(message);
    }, 300));
  }
}

export = DockerodeHandler;