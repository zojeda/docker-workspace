import fs = require("fs");
import path = require("path");
import DockerodeHandler = require("./DockerodeHandler");

class Workspace {
  private workspaceDefinitionPath: string;
  private composeDefinition: any;
  private dockerWorkspaceHandler: DockerodeHandler;

  constructor(public workspaceDefinition: WorkspaceDefinition, workspaceId: string) {
    this.dockerWorkspaceHandler = new DockerodeHandler(workspaceId, this.workspaceDefinition);
  }

  private initialize() {
    // this.workspaceDefinition = fs.readFileSync(this.workspaceDefinitionPath).toJSON();
  }

  public async start(progress? : (string) => any) {
    this.dockerWorkspaceHandler.start(progress);
  }

  public stop(response: Response<string, string>) {
    // this.stopComposition(["down"], response);
  }

  public status(response: Response<string, string>) {
    // this.statusComposition(["ps", "-q"], response);
  }

}



export = Workspace;