# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

[![NPM](https://nodei.co/npm/grpcnode.png?compact=true)](https://nodei.co/npm/grpcnode/)

## cli

Install with `npm i -g grpcnode`.

Now, you can use it like this:

- `grpc-client -?` - get help on using client
- `grpc-server -?` - get help on using server

```
Usage: grpc-client <command> [proto-file] [options]

Commands:
  run [proto-file]       Run an RPC command
  ls [proto-file]        List available RPC commands
  generate [proto-file]  Output a stub implementation for grpc-server.

Options:
  -?, --help  Show help                                                [boolean]

Examples:
  grpc-client run -?                        Get help on running an RPC method
  grpc-client run example.proto -m          Run
  helloworld.Greeter.sayHello -a '{"name":  helloworld.Greeter.sayHello({name:"W
  "World"}'                                 orld"}) from a server at
                                            localhost:5051, defined by api.proto
  grpc-client ls api.proto                  List available RPC methods, defined
                                            by api.proto
  grpc-client generate api.proto            Generate a server implementation
                                            stub from api.proto
```

```
Usage: grpc-server [options] API.proto API.js [API2.proto API2.js ...]

Options:
  -?, --help  Show help                                                [boolean]
  -p, --port  The port to run the gRPC server on                 [default: 5051]

Examples:
  grpc-server -p 3000                       Run a gRPC protobuf server on port
  example/helloworld.proto                  3000
  example/helloworld.js
  grpc-server example/helloworld.proto      Run a gRPC protobuf server made of
  example/helloworld.js t1.proto t2.proto   lots of definitions on port 5051
  t3.proto t1.js t2.js
  grpc-server api/*.proto api/*.js          Run a gRPC protobuf server made of
                                            lots of definitions on port 5051

Define your protobuf rpc in a file ending with .proto, and your implementation
in a .js file, which exports in the same object-shape as protobuf
(package.Service.rpcMethod.) You can specify as many js and proto files as you
like, and a server will be started for all of them.
```


### examples

- Get a list of methods/message-types: `grpc-client ls example/helloworld.proto`
- Run an RPC on server: `grpc-client run example/helloworld.proto -m helloworld.Greeter.sayHello -a '{"name": "World"}'`
- Start a server: `grpc-server example/*.js example/*.proto`

## in your code

Install in your project with `npm i -S grpcnode`.

### server

```js
const grpcnode = require('grpcnode').server
const grpc = require('grpc')

function sayHello (call, callback) {
  const message = `Hello ${call.request.name}`
  callback(null, {message})
}

function sayGoodbye (call, callback) {
  const message = `Goodbye ${call.request.name}`
  callback(null, {message})
}

const implementation = {
  helloworld: {
    Greeter: {
      sayHello,
      sayGoodbye
    }
  }
}

const server = grpcnode('api.proto', implementation)
server.bind('0.0.0.0:' + argv.port, grpc.ServerCredentials.createInsecure())
console.log('gRPC protobuf server started on 0.0.0.0:' + argv.port)
server.start()
```

### client

```js
const grpcnode = require('grpcnode').client

// run remote command
grpcnode.run('api.proto', 'localhost:5051', 'helloworld.Greeter.sayHello', {name:'World'})
  .then(response => { console.log(response) })

// list available RPC & Messages
console.log(grpcnode.ls('api.proto'))

```

