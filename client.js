#! /usr/bin/env node

const yargs = require('yargs')
const grpc = require('grpc')
const path = require('path')

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
        info.services[`${ns}.${svc}`] = proto[ns][svc].service.children.map(r => {
          const cin = r.requestStream ? '~' : ''
          const cout = r.responseStream ? '~' : ''
          return `${r.name}(${cin}${r.requestName}) → ${cout}${r.responseName}`
        })
      } else {
        info.messages[`${ns}.${svc}`] = JSON.stringify(proto[ns][svc].decode(proto[ns][svc].encode({})))
      }
    })
  })
  return info
}

const generate = (protoFile) => {
  const proto = grpc.load(protoFile)
  let out = ''
  Object.keys(proto).forEach(ns => {
    out += `module.exports.${ns} = {}\n`
    Object.keys(proto[ns]).forEach(svc => {
      if (proto[ns][svc].service) {
        out += `module.exports.${ns}.${svc} = {}\n`
        proto[ns][svc].service.children.forEach(r => {
          out += `\nmodule.exports.${ns}.${svc}.${r.name} = (ctx, cb) => {\n  // do stuff with ctx.request\n  // cb(err, response)\n}\n`
        })
      }
    })
  })
  return out
}

const main = () => {
  const argv = yargs
    .usage('Usage: $0 <command> [proto-file] [options]')
    .help('?')
    .alias('?', 'help')
    .boolean('v')
    .describe('v', 'Get the version')
    .alias('v', 'version')

    .example('$0 run -?', 'Get help on running an RPC method')
    .example(`$0 run example.proto -m helloworld.Greeter.sayHello -a '{"name": "World"}'`, 'Run helloworld.Greeter.sayHello({name:"World"}) from a server at localhost:5051, defined by api.proto')
    .example('$0 ls api.proto', 'List available RPC methods, defined by api.proto')
    .example('$0 generate api.proto', 'Generate a server implementation stub from api.proto')

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
    .command('generate [proto-file]', 'Output a stub implementation for grpc-server.')

    .argv

  if (argv.version) {
    console.log('grpc-client version:', require('./package.json').version)
    process.exit()
  }

  if (!argv.protoFile) {
    console.log('Proto definition file is required.\n')
    yargs.showHelp()
    process.exit(1)
  }

  switch (argv._[0]) {
    case 'run':
      run(argv.protoFile, argv.host, argv.method, argv.arguments ? JSON.parse(argv.arguments) : undefined)
        .then(r => { console.log(JSON.stringify(r, null, 2)) })
        .catch(e => {
          console.error(e)
          process.exit(1)
        })
      break
    case 'ls':
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
      break
    case 'generate':
      console.log(generate(argv.protoFile))
      break
    default:
      console.log('Valid commands are `ls`, `generate`, and `run`.\n')
      yargs.showHelp()
      process.exit(1)
  }
}

module.exports = {run, ls, generate}
if (require.main === module) { main() }
