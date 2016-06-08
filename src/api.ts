export interface CommandDefinition {
  description: string;
  style: string;
}

export interface ApplicationDefinition {
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
  code: string;
  commands?: { [name: string]: CommandDefinition };
  tools: { [name: string]: ApplicationDefinition };
  services: { [name: string]: ApplicationDefinition };
  shell?: string;
  provision?: { [name: string]: any };
}

export interface WorkspaceDefinition {
  development: DevelopmentEnvironment;
}

export interface WorkspaceStatus {
  definition: WorkspaceDefinition;
}

export {Workspace} from "./Workspace";
