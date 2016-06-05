interface Response<T, N> {
  complete: (error: Error, response?: T) => void;
  progress?: (N) => void;
}

interface CommandDefinition {
  description: string;
  style: string;
}

interface ApplicationDefinition {
  image?: string;
  command?: string;
  description?: string;
  icon?: string;
  port: number;
  type: "tcp-service" | "http-api" | "web-application";
  shell?: string;
}

interface DevelopmentEnvironment {
  image: string;
  ports?: number[];
  code: string;
  commands?: { [name: string]: CommandDefinition };
  tools: { [name: string]: ApplicationDefinition };
  services: { [name: string]: ApplicationDefinition };
  shell?: string;
}

interface WorkspaceDefinition {
  development: DevelopmentEnvironment;
}

interface User {
  id: string;
  workspaces: WorkspaceDefinition[];
}



interface ProjectDefinition {
  id?: string;
  name: string;
}

