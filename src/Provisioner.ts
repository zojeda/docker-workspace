import {WorkspaceDefinition} from "./api";

export interface Provisioner {
  addContent(workspaceId: string, definition: WorkspaceDefinition, container: dockerode.Container, progress:(string) => void) : Promise<void>;
}
