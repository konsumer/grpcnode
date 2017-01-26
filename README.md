# Simple node-based gRPC client/server

When you want a quick gRPC server or client, made with node.

Install with `npm i -g grpcnode`.

Now, you can use it like this:

- `grpc-client -?` - get help on using client
- `grpc-server -?` - get help on using server
- `grpc-client run example/helloworld.proto helloworld.Greeter.sayHello '{"name":"World"}'` - run `helloworld.Greeter.sayHello` RPC
- `grpc-server example/*.proto example/*.js` - run a server made of several proto & js files

