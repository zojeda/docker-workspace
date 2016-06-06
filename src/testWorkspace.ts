import Workspace = require("./Workspace");
import sampleDefinition = require("./mongoDev");
let workspace = new Workspace(sampleDefinition, "test");

workspace.start(console.log);
