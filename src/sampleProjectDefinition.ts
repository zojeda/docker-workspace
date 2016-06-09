import {WorkspaceDefinition} from "./api";

export let workspaceDefinition: WorkspaceDefinition = {
  development: {
    image: "zojeda/ts-dev",
    ports: [5858, 3000, 5000],
    code: {
      path: "/sample-project",
      provision: { "fs-copy" : {path: "../content"}}
    },
    commands: {
      start: { description: "Start the application", style: "fa fa-play" },
      clean: { description: "Remove all dependencies and built assets", style: "fa fa-trash" },
      install: { description: "Install all dependencies", style: "fa fa-laptop" }
    },
    tools: {
      cloud9: {
        command: "tsserver-client & node /cloud9/server.js --listen 0.0.0 -a : -w /sample-project",
        description: "Cloud9 IDE",
        icon: "<i class=\"{{details.style}}\"></i>",
        port: 8181,
        type: "web-application"
      },
      ungit: {
        image: "zojeda/ts-dev",
        command: "ungit --port=8181 /sample-project",
        port: 8181,
        type: "web-application"
      }
    },
    services: {
      mymongodb: {
        image: "mongo",
        port: 27017,
        type: "tcp-service"
      }
    }
  }

};


