#!/usr/bin/env node

import fs = require("fs");
import path = require("path");
import yargs = require("yargs");

import {Workspace, WorkspaceDefinition} from "./api";

var prettyjson = require("prettyjson");

yargs
    .usage("Usage: $0 <command> [options]")
    .command("start", "Start a workspace from a definition", startWorkspace)
    .command("stop", "Stop a running workspace", stopWorkspace)
    .command("status", "get the status of a running workspace", statusWorkspace)
    .command("list", "list all running workspaces", listWorkspaces)
    .demand(1)

    .help("h")
    .alias("h", "help")
    .epilog("copyright 2016")
    .argv;


function startWorkspace(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: $0 start [workspaceIds] [options]")
    .example("$0 <command> -w <workspace-def.json>", "start one or more workspaces with provided ids")
    .options({
      w: {
        alias: "ws-def",
        default: "workspace-definition.json",
        describe: "Workspace Defininition file (json format)",
        type: "string"
      }
    })
    .help("h")
    .alias("h", "help")
    .argv;

  let workspaceIds = argv._.slice(1) || [path.basename(process.cwd())];
  workspaceIds.forEach(workspaceId => {
    let workspaceDefinition : WorkspaceDefinition = JSON.parse(fs.readFileSync((argv as any).w).toString());
    let workspace = new Workspace(workspaceDefinition, workspaceId);
    workspace.start();
  });
}

function stopWorkspace(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: $0 stop [workspaceId]")
    .example("$0 <command>", "stop one or more workspaces with provided ids")
    .options({
      w: {
        alias: "ws-def",
        default: "workspace-definition.json",
        describe: "Workspace Defininition file (json format)",
        type: "string"
      }
    })
    .help("h")
    .alias("h", "help")
    .argv;

  let workspaceIds = argv._.slice(1) || [path.basename(process.cwd())];
  workspaceIds.forEach(workspaceId => {
    let workspaceDefinition : WorkspaceDefinition = JSON.parse(fs.readFileSync((argv as any).w).toString());
    let workspace = new Workspace(workspaceDefinition, workspaceId);
    workspace.delete();
  });
}

function statusWorkspace(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: $0 status [workspaceId]")
    .example("$0 <command>", "get the runtime status of workspace with the given id")
    .help("h")
    .alias("h", "help")
    .argv;

  let workspaceId = argv._[1] || path.basename(process.cwd());
  console.log("getting status workspace with id :", workspaceId);
  let workspaceDefinition : WorkspaceDefinition = JSON.parse(fs.readFileSync("workspace-definition.json").toString());
  let workspace = new Workspace(workspaceDefinition, workspaceId);
  workspace.status()
    .then(status => console.log(prettyjson.render(status)))
    .catch(error => console.error(error));
}

function listWorkspaces(ya: yargs.Yargs) {
  let argv = ya
    .usage("usage: $0 list [team]")
    .example("$0 <command>", "list all active workspaces in the given team")
    .help("h")
    .alias("h", "help")
    .argv;

  let team = argv._[1];
  Workspace.list(team).then(workspaces => workspaces.forEach((w) => console.log(w)));
}


