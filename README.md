# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

[![NPM](https://nodei.co/npm/grpcnode.png?compact=true)](https://nodei.co/npm/grpcnode/)

## cli

Install with `npm i -g grpcnode`.

Now, you can use it like this:

- `grpc-client -?` - get help on using client
- `grpc-server -?` - get help on using server

### ssl

I generated/signed my demo keys like this:

```
openssl genrsa -passout pass:1111 -des3 -out ca.key 4096
openssl req -passin pass:1111 -new -x509 -days 365 -key ca.key -out ca.crt -subj  "/C=US/ST=Oregon/L=Portland/O=Test/OU=CertAuthority/CN=localhost"
openssl genrsa -passout pass:1111 -des3 -out server.key 4096
openssl req -passin pass:1111 -new -key server.key -out server.csr -subj  "/C=US/ST=Oregon/L=Portland/O=Test/OU=Server/CN=localhost"
openssl x509 -req -passin pass:1111 -days 365 -in server.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out server.crt
openssl rsa -passin pass:1111 -in server.key -out server.key
openssl genrsa -passout pass:1111 -des3 -out client.key 4096
openssl req -passin pass:1111 -new -key client.key -out client.csr -subj "/C=US/ST=Oregon/L=Portland/O=Test/OU=Client/CN=localhost"
openssl x509 -passin pass:1111 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out client.crt
openssl rsa -passin pass:1111 -in client.key -out client.key
```

Then use it on server, like this:

```
grpc-server --ca=ca.crt --key=server.key --cert=server.crt example/helloworld.proto example/helloworld.js
```

And client, like this:

```
grpc-client run example/helloworld.proto --ca=ca.crt --key=client.key --cert=client.crt -m helloworld.Greeter.sayHello -a '{"name": "World"}'`
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

