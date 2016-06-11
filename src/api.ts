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
    provision?: { [name: string]: any };
  };
  commands?: { [name: string]: CommandDefinition };
  tools: { [name: string]: RuntimeDefinition };
  services: { [name: string]: RuntimeDefinition };
  shell?: string;
}

export interface WorkspaceDefinition {
  development: DevelopmentEnvironment;
}

export interface WorkspaceStatus {
  definition: WorkspaceDefinition;
  status: {[path: string]: {
    status: string,
    type: string,
    network: {
      ip: string,
      port: number,
      externalUrl?: string
    },
    definition: RuntimeDefinition
  }};
}

export {Workspace} from "./Workspace";
