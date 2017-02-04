#! /usr/bin/env node

const path = require('path')
const fs = require('fs')
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

    .describe('ca', 'SSL CA cert')
    .describe('key', 'SSL server key')
    .describe('cert', 'SSL server certificate')

    .epilog('Define your protobuf rpc in a file ending with .proto, and your implementation in a .js file, which exports in the same object-shape as protobuf (package.Service.rpcMethod.) You can specify as many js and proto files as you like, and a server will be started for all of them.')
    .example('$0 -h localhost:3000 example/helloworld.proto example/helloworld.js', 'Run a gRPC protobuf server on port 3000')
    .example('$0 example/helloworld.proto example/helloworld.js t1.proto t2.proto t3.proto t1.js t2.js', 'Run a gRPC protobuf server made of lots of definitions on port 5051')
    .example('$0 api/*.proto api/*.js', 'Run a gRPC protobuf server made of lots of definitions on port 5051')

    .describe('h', 'The host/port to run the gRPC server on')
    .default('h', 'localhost:5051')
    .alias('h', 'host')

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

  let credentials
  if (argv.ca || argv.key || argv.cert) {
    if (!(argv.ca && argv.key && argv.cert)) {
      console.log('SSL requires --ca, --key, & --cert\n')
      yargs.showHelp()
      process.exit(1)
    }
    credentials = grpc.ServerCredentials.createSsl(fs.readFileSync(argv.ca), [{
      cert_chain: fs.readFileSync(argv.cert),
      private_key: fs.readFileSync(argv.key)
    }], true)
  } else {
    credentials = grpc.ServerCredentials.createInsecure()
  }

  const server = buildProtoServer(protoFiles, Object.assign({}, ...jsFiles.map(f => require(path.resolve(f)))))
  server.bind(argv.host, credentials)
  console.log(`gRPC protobuf server started on ${argv.host}${(argv.ca || argv.key || argv.cert) && ' using SSL' || ''}`)
  server.start()
}

module.exports = buildProtoServer
if (require.main === module) { main() }
