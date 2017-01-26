# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

## cli

Install with `npm i -g grpcnode`.

Now, you can use it like this:

- `grpc-client -?` - get help on using client
- `grpc-server -?` - get help on using server
- `grpc-client run example/helloworld.proto helloworld.Greeter.sayHello '{"name":"World"}'` - run `helloworld.Greeter.sayHello` RPC
- `grpc-server example/*.proto example/*.js` - run a server made of several proto & js files

## in your code

Install in your project with `npm i -S grpcnode`.

### server

```js
const grpcnode = require('grpcnode').server

const server = grpcnode(['api.proto'], ['api.js'])
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

// list remote commands
console.log(grpcnode.ls('api.proto'))

```

