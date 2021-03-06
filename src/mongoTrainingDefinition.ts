import {WorkspaceDefinition}  from "./api";

export let capaMongoWorkspace: WorkspaceDefinition = {
  development: {
    image: {
      name: "zojeda/mongo-training",
      build: "./devEnv/mongo-training" 
    },
    code: {
      path: "/capacitacion-mongo",
      provisions: [{name: "fsCopy", params: { path: "../hx-capa-mongo/hx-capa-mongo"}}]
    },
    tools: {
      cloud9: {
        command: "node /cloud9/server.js --listen 0.0.0.0 -a : -w /capacitacion-mongo",
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
  },
  team: "mongo.capa.hx"
};


