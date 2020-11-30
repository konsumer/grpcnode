# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

[![NPM](https://nodei.co/npm/grpcnode.png?compact=true)](https://nodei.co/npm/grpcnode/)

## cli

Install with `npm i -g grpcnode` or use it without installing, with `npx grpcnode`.

Now, you can use it like this `grpcnode --help`:

```
grpcnode <command>

Commands:
  grpcnode server <FILES...>     Start a gRPC server with proto and js files
  grpcnode ls <PROTO_FILES...>   List available services on the gRPC server
  grpcnode run <PROTO_FILES...>  Call an RPC on the gRPC server

Options:
  -I, --include  Include proto search path                              [string]
      --help     Show help                                             [boolean]
  -v, --version  Show version number                                   [boolean]

Examples:
  grpcnode ls --help      Get help with listing gRPC commands
  grpcnode run --help     Get help with running gRPC commands
  grpcnode server --help  Get help with running a gRPC server
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
grpcnode run --ca=ca.crt --key=client.key --cert=client.crt -I example/proto helloworld.proto -c '/helloworld.v1.Greeter/SayGoodbye({"name":"World"})'
```

### examples

You can see an example project [here](https://github.com/konsumer/grpcnode/tree/master/example) that shows how to use all the CLI tools, with no code other than your endpoint implementation.

- Get a list of methods/message-types: `grpcnode ls -I ./example/proto helloworld.proto`
- Run an RPC on server: `grpcnode run -I example/proto helloworld.proto --command '/helloworld.v1.Greeter/SayHello({"name": "David"})'`
- Start a server: `grpcnode server -I example/proto helloworld.proto example/helloworld.js`


