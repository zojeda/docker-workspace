let workspaceDefinition: WorkspaceDefinition = {
  development: {
    image: "zojeda/mongo-dev",
    code: "/capacitacion-mongo",
    tools: {
      cloud9: {
        command: "node /cloud9/server.js --listen 0.0.0 -a : -w /capacitacion-mongo",
        description: "Cloud9 IDE",
        icon: "<i class=\"{{details.style}}\"></i>",
        port: 8181,
        type: "web-application"
      }
    },
    services: {
      mongodb: {
        image: "mongo:3.2.6",
        port: 27017,
        type: "tcp-service"
      }
    }
  }

};


export = workspaceDefinition;