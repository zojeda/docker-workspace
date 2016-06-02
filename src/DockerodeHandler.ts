import Docker = require("dockerode");

class DockerodeHandler {
  docker: Docker;
  constructor(private workspaceId: string, private workspaceDefinition: WorkspaceDefinition) {
    this.docker = new Docker();
  }

  public async start(progress? : (string) => any) {
    let services = this.workspaceDefinition.development.services;
    Object.keys(services).forEach((serviceName) => {
      this.runApplication(serviceName, services[serviceName], progress)
    });
  }

  public stop(response: Response<string, string>) {
  }

  public status(response: Response<string, string>) {
  }

  public async runApplication(name: string, app: ApplicationDefinition, progress? : (string) => any) {
    try {
      await this.pull(app.image, progress);
      let created = await this.startContainer(name, app.image, progress);
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

  private async startContainer(name: string, image: string, progress?: (message: string) => any) {
    return new Promise<any>((resolve, reject) => {
      this.docker.createContainer({
        name: this.workspaceId + '_' + name,
        Image: image,
        Cmd: ["tail", "-f", "/dev/null"]
      }, (error, container) => {
        if (error) {
          return reject(error);
        }
        container.start((error) => {
            if (error) {
              return reject(error);
            }
            resolve(container)
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
  private startDevEnvironment(response: Response<string, string>) {
    this.docker.pull(this.workspaceDefinition.development.image, (error, stream) => {
      this.docker.modem.followProgress(stream, onPullFinished, onProgress);
      function onProgress(event) {
        // console.log("progress pull event :", event);
        response.progress(event);
      }
    });
    let onPullFinished = (event) => {
      response.progress("pull finished: " + event);
      let developmentContainerName = this.workspaceId + ".development";
      this.docker.createContainer({
        name: developmentContainerName,
        Image: this.workspaceDefinition.development.image,
        Cmd: ["tail", "-f", "/dev/null"]
      }, (error, container) => {
        if (error) {
          return response.complete(new Error(error.json));
        }
        response.progress(`development container created [${developmentContainerName}]`);
        container.start((error) => {
            if (error) {
              return response.complete(new Error(error.json));
            }
            response.progress(`development container started [${developmentContainerName}]`);
            });
        });
    };
  }
}

export = DockerodeHandler;