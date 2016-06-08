import fs = require("fs");
import path = require("path");
import {DockerodeHandler} from "./DockerodeHandler";
import {WorkspaceDefinition, WorkspaceStatus} from "./api";

export class Workspace {
  private workspaceDefinitionPath: string;
  private composeDefinition: any;
  private dockerWorkspaceHandler: DockerodeHandler;

  constructor(public workspaceDefinition: WorkspaceDefinition, public workspaceId: string) {
    this.dockerWorkspaceHandler = new DockerodeHandler(workspaceId, this.workspaceDefinition);
  }

  private initialize() {
    // this.workspaceDefinition = fs.readFileSync(this.workspaceDefinitionPath).toJSON();
  }

  public async start(progress? : (string) => any) {
    this.dockerWorkspaceHandler.start(progress);
  }

  public async stop(progress? : (string) => any) {
    await this.dockerWorkspaceHandler.stop(progress);
  }
  public async delete(progress? : (string) => any) {
    await this.dockerWorkspaceHandler.delete(progress);
  }

  public async status() : Promise<WorkspaceStatus> {
    return await this.dockerWorkspaceHandler.status();
  }

}
