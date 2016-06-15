export interface CommandDefinition {
  description: string;
  style: string;
}

export interface RuntimeDefinition {
  image?: string;
  command?: string;
  description?: string;
  icon?: string;
  port: number;
  type: "tcp-service" | "http-api" | "web-application";
  shell?: string;
}

export interface DevelopmentEnvironment {
  image: string;
  ports?: number[];
  code: {
    path: string,
    bindToHostPath?: string, //absolute path
    provisions?: { name: string, params: any }[];
  };
  commands?: { [name: string]: CommandDefinition };
  tools: { [name: string]: RuntimeDefinition };
  services: { [name: string]: RuntimeDefinition };
  shell?: string;
}

export interface WorkspaceDefinition {
  development: DevelopmentEnvironment;
  team?: string;
}

export interface RuntimeStatus {
  status: string;
  type: string;
  network: {
    ip: string,
    port: number,
    additional?: {[networkName: string]: string}
  };
  definition: RuntimeDefinition;
}

export interface WorkspaceStatus {
  workspaceId: string;
  runtimes: { [path: string]: RuntimeStatus };
}

export interface Provisioner {
  addContent(workspaceId: string, definition: WorkspaceDefinition, container: dockerode.Container, progress:(string) => void) : Promise<void>;
}

export {Workspace} from "./Workspace";
