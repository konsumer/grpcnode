#! /usr/bin/env node

const yargs = require('yargs')
const grpc = require('grpc')

const run = (protoFile, host, method, params) => {
  return new Promise((resolve, reject) => {
    const proto = grpc.load(protoFile)
    const {0: pkg, 1: svc, 2: action} = method.split('.')
    const client = new proto[pkg][svc](host, grpc.credentials.createInsecure())
    client[action](params, (err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

const ls = (protoFile) => {
  const proto = grpc.load(protoFile)
  const info = {services: {}, messages: {}}
  Object.keys(proto).forEach(ns => {
    Object.keys(proto[ns]).forEach(svc => {
      if (proto[ns][svc].service) {
        info.services[`${ns}.${svc}`] = proto[ns][svc].service.children.map(r => r.name)
      } else {
        info.messages[`${ns}.${svc}`] = JSON.stringify(proto[ns][svc].decode(proto[ns][svc].encode({})))
      }
    })
  })
  return info
}

const main = () => {
  const argv = yargs
    .usage('Usage: $0 <command> [proto-file] [options]')
    .help('?')
    .alias('?', 'help')
    .example('$0 run -?', 'Get help on running an RPC method')
    .example(`$0 run example.proto -m helloworld.Greeter.sayHello -a '{"name": "World"}'`, 'Run helloworld.Greeter.sayHello({name:"World"}) from a server at localhost:5051, defined by api.proto')
    .example('$0 ls api.proto', 'List available RPC methods, defined by api.proto')

    .command('run [proto-file]', 'Run an RPC command', {
      host: {
        describe: 'The host:port where the gRPC server is running',
        default: 'localhost:5051'
      },
      arguments: {
        describe: 'JSON-encoded arguments',
        required: true,
        alias: 'a'
      },
      method: {
        describe: 'The remote-method to call',
        required: true,
        alias: 'm'
      }
    })

    .command('ls [proto-file]', 'List available RPC commands')

    .argv

  if (!argv.protoFile) {
    console.log('Proto definition file is required.\n')
    yargs.showHelp()
    process.exit(1)
  }

  if (['ls', 'run'].indexOf(argv._[0]) === -1) {
    console.log('Valid commands are `ls` and `run`.\n')
    yargs.showHelp()
    process.exit(1)
  }

  if (argv._[0] === 'run') {
    run(argv.protoFile, argv.host, argv.method, argv.arguments ? JSON.parse(argv.arguments) : undefined)
      .then(r => { console.log(JSON.stringify(r, null, 2)) })
      .catch(e => {
        console.error(e)
        process.exit(1)
      })
  } else {
    const info = ls(argv.protoFile)
    console.log('Methods:')
    Object.keys(info.services).forEach(ns => {
      info.services[ns].forEach(method => {
        console.log(`  ${ns}.${method}`)
      })
    })
    console.log('\nMessage-types:')
    Object.keys(info.messages).forEach(msg => {
      console.log(`  ${msg}: ${info.messages[msg]}`)
    })
  }
}

module.exports = {run, ls}
if (require.main === module) { main() }
