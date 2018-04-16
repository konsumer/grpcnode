# grpc-demo

Full demo of my nodejs CLI tools for grpc

It's meant to show to use all the CLI tools, with no code other than your endpoint implementation.

## usage

* `npm install` - to install dependencies
* `npm run grpc` - to start gRPC server
* `npm run gateway` - start gateway
* `npm run ls` - list defined interface
* `npm test` - run a gRPC client test

## protoc

> TODO: put docker instructions in here, instead.

If you'd like to play with it, in a full protobuf compiler, I recommend protoc & lint plugin (at the very least) for checking your syntax.

On Mac:

```
brew install go protobuf
go get github.com/ckaznocha/protoc-gen-lint

protoc --plugin=$HOME/go/bin/protoc-gen-lint --lint_out=. -I ./proto/ ./proto/helloworld.proto
```

There are lots of other protoc plugins available for generating code from your proto definition, and you can even use [my library](https://www.npmjs.com/package/protoc-plugin) to make your own in node.