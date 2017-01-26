# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

[![NPM](https://nodei.co/npm/grpcnode.png?compact=true)](https://nodei.co/npm/grpcnode/)

## cli

Install with `npm i -g grpcnode`.

Now, you can use it like this:

- `grpc-client -?` - get help on using client
- `grpc-server -?` - get help on using server

### examples

- Get a list of methods/message-types: `grpc-client ls example/helloworld.proto`
- Run an RPC on server: `grpc-client run example/helloworld.proto -m helloworld.Greeter.sayHello -a '{"name": "World"}'`
- Start a server: `grpc-server example/*.js example/*.proto`

## in your code

Install in your project with `npm i -S grpcnode`.

### server

```js
const grpcnode = require('grpcnode').server

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

const server = grpcnode(['api.proto'], implementation)
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

