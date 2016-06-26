declare namespace dockerode {
  interface DockerResponse<T> { (error: Error, response?: T): void; }


  interface Labels {
    [key: string]: string
  }

  //https://docs.docker.com/engine/reference/api/docker_remote_api_v1.22/#create-a-container
  interface ContainerCreateOptions {
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
    },
    NetworkingConfig?: {
      EndpointsConfig: {
          [name: string]: {
              IPAMConfig?: {
                  [name: string]: string
              },
              Links?: string[],
              Aliases?: string[]
          }
      };
    }
  }
  

  interface CreateContainerReq extends ContainerCreateOptions {
    Image: string;
  }

  interface CreateVolumeOptions {
    Name: string,
    Labels: Labels
  }

  interface VolumesInfo {
    Volumes: {
      Name: string,
      Driver: string,
      Mountpoint: string,
      Labels: Labels
    }[]
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
    Labels: Labels;
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
  
  interface NetworkInfo   {
    Name: string,
    Id: string,
    Scope: string,
    Driver: string,
    EnableIPv6: boolean,
    Internal: boolean,
    IPAM: {
      Driver: string,
      Config: [
        { [key: string]: string}
      ]
    },
    Containers: {
      [id: string]: {
        EndpointID: string,
        MacAddress: string,
        IPv4Address: string,
        IPv6Address: string
      }
    },
    Options: { [key: string]: string},
    Labels: Labels
  }
  
  interface ErrorObject {
    reason: string;
    statusCode: number;
    json: string;
  }
  
  interface ContainerStartOptions { 
    detachKeys: string
  }
  
  interface ContainerUpdateOptions    {
     BlkioWeight: number,
     CpuShares: number,
     CpuPeriod: number,
     CpuQuota: number,
     CpusetCpus: string,
     CpusetMems: string,
     Memory: number,
     MemorySwap: number,
     MemoryReservation: number,
     KernelMemory: number,
     RestartPolicy: {
       MaximumRetryCount: number,
       Name: string
     },
   }
  interface ContainerRemoveOptions {
     v?: boolean, force?: boolean
  }
  interface PutArchiveOptions {
      path: string,                  // - path to a directory in the container to extract the archive’s contents into. Required 
      noOverwriteDirNonDir?: boolean  // - If “1”, “true”, or “True” then it will be an error if unpacking the given content would cause an existing directory to be replaced with a non-directory and vice versa.
  }
  interface Container {
    id: string;
    inspect(options: {
      size: boolean
    }, callback: DockerResponse<any>); //TODO info
    inspect(done: DockerResponse<any>); //TODO
    //rename
    update(params: ContainerUpdateOptions, done: DockerResponse<{Warings: string[]}>)
    //changes
    //export
    start(params: ContainerStartOptions, done: DockerResponse<void>);
    start(done: DockerResponse<any>);
    //pause
    //unpause
    //exec
    //commit
    stop(done: DockerResponse<any>);
    restart(done: DockerResponse<void>);
    restart(params: { t: number }, done: DockerResponse<void>);
    kill({signal: string}, done: DockerResponse<void>);
    //resize
    //attach
    //wait
    remove(done: DockerResponse<any>);
    remove(options: ContainerRemoveOptions, done: DockerResponse<any>);
    //copy
    //getArchive
    //infoArchive
    putArchive(tarPath: string, options: PutArchiveOptions, done: DockerResponse<void>);
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
    connect({Container: string}, done: DockerResponse<void>);
  }

  interface Volume {
    //inspect
    //remove
  }

  interface ListConainersQueryParameters {
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
  
  interface ListNetworksQueryParameters {
    filters?:  {       //  - JSON encoded network list filter. The filter value is one of:
        name?: string[]  //  =<network-name> Matches all or part of a network name.
        id?: string,   //  =<network-id> Matches all or part of a network id.
        type?: "custom"|"builtin"// Filters networks by type. The custom keyword returns all user-defined networks.
    }
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
    pull(tag: string, done: DockerResponse<NodeJS.ReadableStream>);
    listContainers() : Promise<ContainerInfo[]>;
    listContainers(options: ListConainersQueryParameters) : Promise<ContainerInfo[]>;
    getContainer(id: string): Container;
    listNetworks() : Promise<NetworkInfo[]>;
    listNetworks(options: ListNetworksQueryParameters) : Promise<NetworkInfo[]>;
    listVolumes() : Promise<VolumesInfo>;
    getNetwork(id: string): Network;

    /**
     * image: string,  // - container image
     * cmd: string[],  // - command to be executed
     * stream: any,    // - stream(s) which will be used for execution output.
     * create_options: any, // options used for container creation. (optional)
     * start_options: any,  //- options used for container start. (optional)
     * callback: any      // - callback called when execution ends.
     */
    run(image: string, cmd: string, stream: NodeJS.WritableStream[], create_options: ContainerCreateOptions, start_options?: ContainerStartOptions, done?: DockerResponse<Container>);
    createContainer(configuration: CreateContainerReq) : Promise<Container>;
    createVolume(options: CreateVolumeOptions) : Promise<Volume>;
    getEvents(options: EventsQueryParameters, done: DockerResponse<NodeJS.ReadableStream>);
    createNetwork(options: NetworkParameters) : Promise<{ id: string, Warning?: string }>;
  }
}


declare module "dockerode" {
  export = dockerode.Docker;
}