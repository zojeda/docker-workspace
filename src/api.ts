export interface CommandDefinition {
  description: string;
  style: string;
}

export interface BuildImageDefinition {
  build: string;
  name: string;
}

export type RuntimeImage =  string | BuildImageDefinition;

export interface RuntimeDefinition {
  image?: RuntimeImage;
  command?: string;
  description?: string;
  icon?: string;
  port?: number;
  type: "tcp-service" | "http-api" | "web-application" | "process";
  shell?: string;
}

export interface Volume {
    path: string;
    bindToHostPath?: string;
    provisions?: {
      name: string;
      params: any;
    }[];
  };

export interface DevelopmentEnvironment {
  image: RuntimeImage;
  ports?: number[];
  code: Volume;
  commands?: {
    [name: string]: CommandDefinition;
  };
  tools?: {
    [name: string]: RuntimeDefinition;
  };
  services?: {
    [name: string]: RuntimeDefinition;
  };
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
    ip: string;
    port: number;
    additional?: {
      [networkName: string]: string;
    };
  };
  definition: RuntimeDefinition;
}
export interface WorkspaceStatus {
  workspaceId: string;
  runtimes: {
    [path: string]: RuntimeStatus;
  };
}
export { Workspace } from "./Workspace";
