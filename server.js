#! /usr/bin/env node

const path = require('path')
const yargs = require('yargs')
const grpc = require('grpc')

/**
 * Create a gRPC server from several proto and js files
 * @param  {string[]} protoFiles Array of filenames that should be merged into definition
 * @param  {Object} methods      JS implementations of your RPCs, in same structure as they are in protos
 * @return {GRPCServer}          The gRPC server
 */
const buildProtoServer = (protoFiles, methods) => {
  if (!Array.isArray(protoFiles)) {
    protoFiles = [protoFiles]
  }
  const server = new grpc.Server()
  protoFiles.forEach(p => {
    const proto = grpc.load(p)
    Object.keys(proto).forEach(p => {
      Object.keys(proto[p]).forEach(t => {
        if (proto[p][t].service) {
          const methodImplementations = {}
          proto[p][t].service.children.forEach(c => {
            if (typeof methods[p][t][c.name] === 'function') {
              methodImplementations[c.name] = methods[p][t][c.name]
            }
          })
          server.addProtoService(proto[p][t].service, methodImplementations)
        }
      })
    })
  })
  return server
}

const main = () => {
  const argv = yargs
    .usage('Usage: $0 [options] API.proto API.js [API2.proto API2.js ...]')
    .help('?')
    .alias('?', 'help')
    .boolean('v')
    .describe('v', 'Get the version')
    .alias('v', 'version')

    .epilog('Define your protobuf rpc in a file ending with .proto, and your implementation in a .js file, which exports in the same object-shape as protobuf (package.Service.rpcMethod.) You can specify as many js and proto files as you like, and a server will be started for all of them.')
    .example('$0 -p 3000 example/helloworld.proto example/helloworld.js', 'Run a gRPC protobuf server on port 3000')
    .example('$0 example/helloworld.proto example/helloworld.js t1.proto t2.proto t3.proto t1.js t2.js', 'Run a gRPC protobuf server made of lots of definitions on port 5051')
    .example('$0 api/*.proto api/*.js', 'Run a gRPC protobuf server made of lots of definitions on port 5051')

    .describe('p', 'The port to run the gRPC server on')
    .default('p', 5051)
    .alias('p', 'port')

    .argv

  if (argv.version) {
    console.log('grpc-server version:', require('./package.json').version)
    process.exit()
  }

  const protoFiles = argv._.filter(f => path.extname(f) === '.proto')
  const jsFiles = argv._.filter(f => path.extname(f) === '.js')

  if (protoFiles.length < 1 || jsFiles.length < 1) {
    console.log('Implementation js and proto definition file[s] are required.\n')
    yargs.showHelp()
    process.exit(1)
  }

  const server = buildProtoServer(protoFiles, Object.assign({}, ...jsFiles.map(f => require(path.resolve(f)))))
  server.bind('0.0.0.0:' + argv.port, grpc.ServerCredentials.createInsecure())
  console.log('gRPC protobuf server started on 0.0.0.0:' + argv.port)
  server.start()
}

module.exports = buildProtoServer
if (require.main === module) { main() }
