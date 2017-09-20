#!/usr/bin/env node

const fs = require('fs')
const yargs = require('yargs')
const grpc = require('grpc')

const lowerFirstChar = str => str.charAt(0).toLowerCase() + str.slice(1)

// TODO: change case of method to match what it is in protobuf
const run = (protoFile, host, method, params, credentials, include) => {
  credentials = credentials || grpc.credentials.createInsecure()
  return new Promise((resolve, reject) => {
    const proto = include ? grpc.load({file: protoFile, root: include}) : grpc.load(protoFile)
    const [pkg, svc, action] = method.split('.')
    const client = new proto[pkg][svc](host, credentials)
    client[lowerFirstChar(action)](params, (err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

const ls = (protoFile, include) => {
  const proto = include ? grpc.load({file: protoFile, root: include}) : grpc.load(protoFile)
  const info = {services: {}, messages: {}}
  Object.keys(proto).forEach(ns => {
    Object.keys(proto[ns]).forEach(svc => {
      if (proto[ns][svc].service) {
        info.services[`${ns}.${svc}`] = Object.keys(proto[ns][svc].service).map(s => {
          const r = proto[ns][svc].service[s]
          const cin = r.requestStream ? '~' : ''
          const cout = r.responseStream ? '~' : ''
          return `${lowerFirstChar(r.originalName)}(${cin}${r.requestType.name}) → ${cout}${r.responseType.name}`
        })
      } else {
        if (proto[ns][svc].encode) {
          const val = proto[ns][svc].decode(proto[ns][svc].encode())
          try {
            info.messages[`${ns}.${svc}`] = JSON.stringify(val)
          } catch (e) {
            const out = {}
            Object.keys(val).forEach(v => {
              if (val[v].map) {
                out[v] = `Map <${val[v].keyElem.type.name} : ${val[v].valueElem.type.name}>`
              } else {
                out[v] = val[v]
              }
            })
            info.messages[`${ns}.${svc}`] = JSON.stringify(out)
          }
        }
      }
    })
  })
  return info
}

const generate = (protoFile, include) => {
  const proto = include ? grpc.load({file: protoFile, root: include}) : grpc.load(protoFile)
  let out = ''
  Object.keys(proto).forEach(ns => {
    out += `module.exports.${ns} = {}\n`
    Object.keys(proto[ns]).forEach(svc => {
      if (proto[ns][svc].service) {
        out += `module.exports.${ns}.${svc} = {}\n`
        Object.keys(proto[ns][svc].service).forEach(i => {
          const r = proto[ns][svc].service[i]
          out += `\nmodule.exports.${ns}.${svc}.${r.originalName} = (ctx, cb) => {\n  // do stuff with ctx.request\n  // cb(err, response)\n}\n`
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
      include: {
        describe: 'Path to resolve imports from',
        alias: 'I'
      },
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
      },
      ca: {
        describe: 'SSL CA cert'
      },
      key: {
        describe: 'SSL client key'
      },
      cert: {
        describe: 'SSL client certificate'
      }
    })
    .command('ls [proto-file]', 'List available RPC commands', {
      include: {
        describe: 'Path to resolve imports from',
        alias: 'I'
      }
    })
    .command('generate [proto-file]', 'Output a stub implementation for grpc-server.', {
      include: {
        describe: 'Path to resolve imports from',
        alias: 'I'
      }
    })

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
      let credentials
      if (argv.ca || argv.key || argv.cert) {
        if (!(argv.ca && argv.key && argv.cert)) {
          console.log('SSL requires --ca, --key, & --cert\n')
          yargs.showHelp()
          process.exit(1)
        }
        credentials = grpc.credentials.createSsl(
          fs.readFileSync(argv.ca),
          fs.readFileSync(argv.key),
          fs.readFileSync(argv.cert)
        )
      } else {
        credentials = grpc.credentials.createInsecure()
      }

      run(argv.protoFile, argv.host, argv.method, argv.arguments ? JSON.parse(argv.arguments) : undefined, credentials, argv.include)
        .then(r => { console.log(JSON.stringify(r, null, 2)) })
        .catch(e => {
          console.error(e)
          process.exit(1)
        })
      break
    case 'ls':
      const info = ls(argv.protoFile, argv.include)
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
      console.log(generate(argv.protoFile, argv.include))
      break
    default:
      console.log('Valid commands are `ls`, `generate`, and `run`.\n')
      yargs.showHelp()
      process.exit(1)
  }
}

module.exports = {run, ls, generate}
if (require.main === module) { main() }
