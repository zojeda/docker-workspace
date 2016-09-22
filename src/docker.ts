
const Docker = require("./DockerPromise");
const dockerOpts = require("dockerode-options");

export const docker: dockerode.Docker = new Docker(dockerOpts());
