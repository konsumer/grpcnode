# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

[![NPM](https://nodei.co/npm/grpcnode.png?compact=true)](https://nodei.co/npm/grpcnode/)

## cli

Install with `npm i -g grpcnode`.

Now, you can use it like this:

```
grpcnode <command>

Commands:
  grpcnode server <FILES...>  Start a gRPC server with your proto and javascript files
  grpcnode client             Act as a client of a gRPC server

Options:
  --help         Show help                                           [boolean]
  --ca           SSL CA cert
  --key          SSL server key
  --cert         SSL server certificate
  -h, --host     The host/port to run the gRPC server on             [default: "localhost:50051"]
  -v, --version  Show version number                                 [boolean]
  -I, --include  Root include path (sorry only one root-path works)

Examples:
  grpcnode client --help  Get more help about the client command
  grpcnode server --help  Get more help about the server command
```

### ssl

With SSL, you will need the Cert Authority certificate, client & server signed certificate and keys.


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
grpcnode server --ca=ca.crt --key=server.key --cert=server.crt -I example/ example/helloworld.proto example/helloworld.js
```

And client, like this:

```
grpcnode client run --ca=ca.crt --key=client.key --cert=client.crt -I example/proto helloworld.proto -c '/helloworld.v1.Greeter/SayGoodbye({"name":"World"})'
```

### examples

You can see an example project [here](https://github.com/konsumer/grpcnode/example) that shows how to use all the CLI tools, with no code other than your endpoint implementation.

- Get a list of methods/message-types: `grpcnode client ls -I ./example/proto helloworld.proto`
- Start a server: `grpc-server -I example/ example/*.js example/*.proto` or `node server.js -I example/ example/helloworld.js helloworld.proto`
- Run an RPC on server: `grpcnode server -I example/proto helloworld.proto example/helloworld.js`


# TODO

I'm going through a major refactor to make namespaces work better & improve output. Here's what I need to do before that is complete:

* depracate example (point here)
* setup travis & greenkeeper for grpcnode & gateway
* re-publish changes to grpcnode (with new major) & gateway
* docker-publish gateway

