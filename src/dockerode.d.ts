declare namespace dockerode {
  interface DockerResponse<T> { (error: Error, response?: T): void; }


  interface Labels {
    [key: string]: string
  }

  //https://docs.docker.com/engine/reference/api/docker_remote_api_v1.22/#create-a-container
  interface CreateContainerOptions {
    name?: string;
    Hostname?: string;
    Domainname?: string;
    User?: string;
    AttachStdin?: boolean;
    AttachStdout?: boolean;
    AttachStderr?: boolean;
    Tty?: boolean;
    OpenStdin?: boolean;
    StdinOnce?: boolean;
    Env?: string[];
    Cmd?: string[] | string;
    Entrypoint?: string;
    Labels?: { [label: string]: string };
    Mounts?: {
      Name?: string;
      Source?: string;
      Destination?: string;
      Driver?: string;
      Mode?: string;
      RW?: boolean;
      Propagation?: string;
    }[];
    WorkingDir?: string;
    NetworkDisabled?: boolean;
    MacAddress?: string;
    ExposedPorts?: {
      [port: string]: {}
    };
    StopSignal?: string;
    HostConfig?: {
      Binds?: string[],
      Links?: string[],
      Memory?: number;
      MemorySwap?: number;
      MemoryReservation?: number;
      KernelMemory?: number;
      CpuShares?: number;
      CpuPeriod?: number;
      CpuQuota?: number;
      CpusetCpus?: string;
      CpusetMems?: string;
      BlkioWeight?: number;
      BlkioWeightDevice?: [{}];
      BlkioDeviceReadBps?: [{}];
      BlkioDeviceReadIOps?: [{}];
      BlkioDeviceWriteBps?: [{}];
      BlkioDeviceWriteIOps?: [{}];
      MemorySwappiness?: number;
      OomKillDisable?: boolean;
      OomScoreAdj?: number;
      PortBindings?: { [port: string]: [{ HostPort?: string }] },
      PublishAllPorts?: boolean;
      Privileged?: boolean;
      ReadonlyRootfs?: boolean;
      Dns?: string[];
      DnsOptions?: string[];
      DnsSearch?: string[];
      ExtraHosts?: string[];
      VolumesFrom?: string[];
      CapAdd?: string[];
      CapDrop?: string[];
      GroupAdd?: string[];
      RestartPolicy?: { Name?: string; MaximumRetryCount?: number };
      NetworkMode?: string;
      Devices?: [{ PathOnHost?: string, PathInContainer?: string, CgroupPermissions?: string }];
      Ulimits?: [{}];
      LogConfig?: {
        Type?: string, //json-file, syslog, journald, gelf, awslogs, splunk, none. json-file 
        Config?: {}
      };
      SecurityOpt?: string[];
      CgroupParent?: string;
      VolumeDriver?: string;
      ShmSize?: number;
    };
  }

  interface CreateContainerReq extends CreateContainerOptions {
    Image: string;
  }

  interface ContainerInfo {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    Status: string;
    Ports: {
      IP: string,
      PrivatePort: number,
      PublicPort: number;
      Type: string
    }[];
    Labels: {};
    SizeRw: number;
    SizeRootFs: number;
    NetworkSettings: {
      Networks: {
        [name: string]: {
          NetworkID: string;
          EndpointID: string;
          Gateway: string;
          IPAddress: string;
          IPPrefixLen: number;
          IPv6Gateway: string;
          GlobalIPv6Address: string;
          GlobalIPv6PrefixLen: number;
          MacAddress: string;
        }
      }
    };

  }
  interface ErrorObject {
    reason: string;
    statusCode: number;
    json: string;
  }


  interface Container {
    id: string;
    inspect(options: {
      size: boolean
    }, callback: DockerResponse<any>); //TODO info
    inspect(done?: DockerResponse<any>); //TODO
    //rename
    //update
    //changes
    //export
    start(params: { detachKeys: string }, done?: (err?: Error) => any);
    start(done?: (err?: ErrorObject) => any);
    //pause
    //unpause
    //exec
    //commit
    stop(done: DockerResponse<any>);
    restart(done: DockerResponse<void>);
    restart(params: { t: number }, done: DockerResponse<void>);
    //kill
    //resize
    //attach
    //wait
    remove(done: DockerResponse<any>);
    remove(options: { v?: boolean, force?: boolean }, done: DockerResponse<any>);
    //copy
    //getArchive
    //infoArchive
    //putArchivo
    logs(options: {
      follow?: boolean; // - 1/True/true or 0/False/false, return stream. Default false.
      stdout?: boolean, // – 1/True/true or 0/False/false, show stdout log. Default false.
      stderr?: boolean, // – 1/True/true or 0/False/false, show stderr log. Default false.
      since?: number,   // – UNIX timestamp (integer) to filter logs. Specifying a timestamp will only output log-entries since that timestamp. Default: 0 (unfiltered)
      timestamps?: boolean, // – 1/True/true or 0/False/false, print timestamps for every log line. Default false.
      tail?: number;
    }, done: DockerResponse<NodeJS.ReadableStream>);
    //stats
  }

  interface Network {
    remove(done: DockerResponse<any>);
  }

  interface ListQueryParameters {
    all?: boolean;
    limit?: number;
    since?: string;
    before?: string;
    size?: boolean;
    filters?: {
      //  -- containers with exit code of <int>
      exited?: number[],
      status?: ("created" | "restarting" | "running" | "paused" | "exited" | "dead")[],
      label?: string[],
      isolation?: ("default" | "process" | "hyperv")[]// (Windows daemon only)
    };
  }

  interface EventsQueryParameters {
    since?: number;
    until?: number;
    filters?: {
      // -- container to filter
      container?: string[],
      // -- event to filter
      event?: string[],
      // -- image to filter
      image?: string[],
      // -- image and container label to filter
      label?: string[],
      // -- either container or image or volume or network
      type?: ("container" | "image" | "volume" | "network")[],
      // -- volume to filter
      volume?: string[],
      // -- network to filter
      network?: string[]
    };
  }
  interface NetworkParameters {
    Name: string;             //  - The new network’s name. this is a mandatory field
    CheckDuplicate?: boolean;  //  - Requests daemon to check for networks with same name
    Driver?: string;           //  - Name of the network driver plugin to use. Defaults to bridge driver
    Internal?: boolean;        //  - Restrict external access to the network
    IPAM?: any;                //  - Optional custom IP scheme for the network
    EnableIPv6?: boolean;      //  - Enable IPv6 on the network
    Options?: any;             //- Network specific options to be used by the drivers
    Labels?: Labels;           //  - Labels to set on the network, specified as a map:

  }

  interface AuthConfig {
    username: string;
    password: string;
    auth: '';
    email?: string;
    serveraddress: string;
  }


  class Modem {
    followProgress(stream: NodeJS.ReadableStream, onFinished: (error, output) => any, onProgress: (event) => any);
  }


  class Docker {
    modem: Modem;
    constructor(dockerHost?: any);
    pull(tag: string, auth: { "authconfig": AuthConfig }, done: DockerResponse<any>);
    pull(tag: string, done: (err: ErrorObject, stream: NodeJS.ReadableStream) => any);
    listContainers(done: DockerResponse<ContainerInfo[]>);
    listContainers(options: ListQueryParameters, done: DockerResponse<ContainerInfo[]>);
    getContainer(id: string): Container;
    getNetwork(id: string): Network;

    /**
     * image: string,  // - container image
     * cmd: string[],  // - command to be executed
     * stream: any,    // - stream(s) which will be used for execution output.
     * create_options: any, // options used for container creation. (optional)
     * start_options: any,  //- options used for container start. (optional)
     * callback: any      // - callback called when execution ends.
     */
    run(image, cmd, stream, create_options?: CreateContainerOptions, start_options?: any, callback?);
    //run(image, cmd, stream, callback);
    createContainer(configuration: CreateContainerReq, callback: (err: ErrorObject, container: Container) => any);
    getEvents(options: EventsQueryParameters, callback: (err: ErrorObject, events: NodeJS.ReadableStream) => any)
    createNetwork(options: NetworkParameters, callback: (err: ErrorObject, network: { Id: string, Warning?: string }) => any)
  }
}


declare module "dockerode" {
  export = dockerode.Docker;
}