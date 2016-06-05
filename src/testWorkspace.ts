import Workspace = require("./Workspace");
import sampleDefinition = require("./mongoDev");
let workspace = new Workspace(sampleDefinition);

workspace.start(console.log);
