import Workspace = require("./Workspace");
import sampleDefinition = require("./sampleProjectDefinition");
let workspace = new Workspace(sampleDefinition);

workspace.start(console.log);
