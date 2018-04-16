#!/usr/bin/env ./node_modules/.bin/babel-node

import { readFileSync } from 'fs'
import { extname, resolve } from 'path'
import yargs from 'yargs'
import { merge, get } from 'lodash'
import grpc from 'grpc'
import chalk from 'chalk'
import indent from 'indent'
import colorize from 'json-colorizer'

// require, but find the file from where the user is
const reqCwd = name => require(resolve(process.cwd(), name))

// synchronous read file, from where user is
const readFile = name => readFileSync(resolve(process.cwd(), name))

// show an error and exit
const error = msg => {
  yargs.showHelp()
  console.error(chalk.red(msg))
  process.exit(1)
}

// regex used to split up command for client run
const rCommand = /^(.+)\((.*)\)$/

// get credentials for SSL or not
const getCredentials = (ca, key, cert, server = true) => {
  let credentials
  const factory = server ? grpc.ServerCredentials : grpc.credentials
  if (ca || key || cert) {
    if (!(ca && key && cert)) {
      error('SSL requires --ca, --key, & --cert\n')
    }
    credentials = factory.createSsl(readFile(ca), [{
      cert_chain: readFile(cert),
      private_key: readFile(key)
    }], true)
  } else {
    credentials = factory.createInsecure()
  }
  return credentials
}

// recursive inner-loop for makeServer
const addImplementations = (proto, server, implementation, name = '', debug = true) => {
  const handlers = {}
  Object.keys(implementation).forEach(i => {
    if (typeof implementation[i] === 'function') {
      const formattedName = chalk.blue(`${name.replace(/^\./, chalk.white('/')).replace(/\./g, chalk.white('.'))}/${chalk.cyan(i)}`)
      console.log(`${formattedName} added.`)
      handlers[ i ] = (ctx, cb) => {
        Promise.resolve(implementation[i](ctx))
          .then(res => {
            if (debug) {
              console.log(`GRPC: ${chalk.yellow((new Date()).toISOString())} (${chalk.cyan(ctx.getPeer())}): ${formattedName}(${colorize(ctx.request)})`)
            }
            cb(null, res)
          })
          .catch(err => cb(err))
      }
    } else {
      addImplementations(proto[i], server, implementation[i], `${name}.${i}`, debug)
    }
  })
  if (proto.service) {
    server.addService(proto.service, handlers)
  }
}

// given an implementation object and some proto-filenames, make a server
const makeServer = (implementation, protoFiles, root, quiet) => {
  const server = new grpc.Server()
  protoFiles.forEach(file => {
    const proto = grpc.load({file, root})
    addImplementations(proto, server, implementation, '', !quiet)
  })
  return server
}

// display structure of proto service
const ls = (proto) => {
  Object.keys(proto).forEach(p => {
    if (typeof proto[p] === 'object') {
      ls(proto[p])
    }
    if (proto[p].service) {
      console.log(Object.values(proto[p].service)
        .map(p => {
          return p.path.replace(/\/(.+)\/[0-9a-zA-Z_]+$/, '/' + chalk.yellow('$1') + '/' + chalk.green(p.originalName) + `(${chalk.cyan(p.requestType.name)}) => ${chalk.cyan(p.responseType.name)}`) + '\n' +
            indent(chalk.cyan(p.requestType.name) + ': ' + colorize(p.requestDeserialize(p.requestSerialize({}))), 2) + '\n' +
            indent(chalk.cyan(p.responseType.name) + ': ' + colorize(p.responseDeserialize(p.responseSerialize({}))), 2)
        })
        .join('\n\n')
      )
    }
  })
}

// run a remote gRPC command
const run = (files, rpc, input, host = 'localhost:50051', root, ca, key, cert) => {
  const credentials = getCredentials(ca, key, cert, false)
  for (let f in files) {
    const proto = grpc.load({file: files[f], root})
    const ns = rpc.split('/')[1]
    const Service = get(proto, ns)
    if (Service) {
      const client = new Service(host, credentials)
      const mname = Object.keys(Service.service).filter(s => Service.service[s].path === rpc).pop()
      if (mname) {
        return new Promise((resolve, reject) => {
          client[mname](input, (err, res) => {
            if (err) return reject(err)
            return resolve(res)
          })
        })
      }
    }
  }
  return Promise.reject(new Error('Method not found.'))
}

yargs // eslint-disable-line
  .command('server <FILES...>', 'Start a gRPC server with your proto and javascript files',
    yargs => {
      yargs
        .boolean('quiet')
        .describe('quiet', `Suppress logs`)
        .alias('quiet', 'q')
        .example(`$0 server -I example/proto helloworld.proto`, 'Start a gRPC server')
    },
    argv => {
      const files = (Array.isArray(argv.FILES) ? argv.FILES : [argv.FILES])
      const protoFiles = files.filter(n => extname(n) === '.proto')
      const jsFiles = files.filter(n => extname(n) === '.js').map(n => reqCwd(n))
      if (!protoFiles.length) {
        error('You must set at least 1 proto IDL file.')
      }
      if (!jsFiles.length) {
        error('You must set at least 1 js implementation file.')
      }
      const { ca, key, cert, host, include, quiet } = argv
      const implementation = merge({}, ...jsFiles)
      const credentials = getCredentials(ca, key, cert)
      const server = makeServer(implementation, protoFiles, resolve(process.cwd(), include), quiet)
      server.bind(host, credentials)
      console.log(chalk.yellow(`gRPC protobuf server started on ${chalk.green(host)}${ca ? chalk.blue(' using SSL') : ''}`))
      server.start()
    }
  )

  .command('client', 'Act as a client of a gRPC server',
    yargs => {
      yargs
        .command('ls <FILES...>', 'List available services on the gRPC server', yargs => {
          yargs
            .example(`$0 client ls -I example/proto helloworld.proto`, 'Get a list of available gRPCs')
        }, argv => {
          const files = (Array.isArray(argv.FILES) ? argv.FILES : [argv.FILES])
          const protoFiles = files.filter(n => extname(n) === '.proto')
          if (!protoFiles.length) {
            error('You must set at least 1 proto IDL file.')
          }
          files.forEach(file => {
            const proto = grpc.load({file, root: argv.include})
            ls(proto)
          })
        })

        .command('run <FILES...>', 'Call an RPC on the gRPC server', yargs => {
          yargs
            .describe('command', '[REQUIRED] The command you want to run')
            .alias('command', 'c')
            .example(`$0 client run -I example/proto helloworld.proto -c '/helloworld.v1.Greeter/SayHello({"name": "David"})'`, 'Call gRPC with a parameter. Parameter should be JSON.')
            .example(`$0 client run -I example/proto helloworld.proto -c '/helloworld.v1.Greeter/SayHello()'`, 'Call gRPC with no parameter.')
        }, argv => {
          const { ca, key, cert, host, include, command, FILES } = argv
          if (!command) {
            error('Command is required.')
          }
          try {
            let input = {}
            const [_, rpc, param] = rCommand.exec(command) // eslint-disable-line
            if (param !== '') {
              input = JSON.parse(param)
            }
            run(FILES, rpc, input, host, resolve(process.cwd(), include), ca, key, cert)
              .then(r => { console.log(colorize(JSON.stringify(r, null, 2))) })
              .catch(e => {
                console.error(chalk.red(e))
                process.exit(1)
              })
          } catch (e) {
            console.error(chalk.red(e.message))
            console.error(e)
            error('Please check the format of your gRPC call')
          }
        })
        .demandCommand(1, 'You must set a command: `ls` or `run`')
    }
  )

  .example('$0 client --help', 'Get more help about the client command')
  .example('$0 server --help', 'Get more help about the server command')
  .help()
  .version().alias('v', 'version')
  .wrap(process.stdout.columns)
  .demandCommand(1, 'You must set a command: `server` or `client`')
  .describe('include', 'Root include path (sorry only one root-path works)')
  .alias('I', 'include')
  .describe('ca', 'SSL CA cert')
  .describe('key', 'SSL server key')
  .describe('cert', 'SSL server certificate')
  .describe('h', 'The host/port to run the gRPC server on')
  .default('h', process.env.GRPC_HOST || 'localhost:50051')
  .alias('h', 'host')
  .argv
