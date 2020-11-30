#!/usr/bin/env node

import yargs from 'yargs'
import { extname } from 'path'
import * as grpc from 'grpc'
import * as protoLoader from '@grpc/proto-loader'
import chalk from 'chalk'
import jsoncolor from 'jsoncolor'
import indent from 'indent'
import { promises as fs } from 'fs'
import { merge, get } from 'lodash'

// setup a proto
function getProto (allFiles, include) {
  const files = (Array.isArray(allFiles) ? allFiles : [allFiles]).filter(n => extname(n) === '.proto')
  const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: Array.isArray(include) ? include : [include]
  }
  return files.map(file => protoLoader.loadSync(file, options)).reduce((a, c) => ({ ...a, ...c }), {})
}

// sort an array of objects by a field
function sortBy (name) {
  return (a, b) => {
    if (a[name] < b[name]) return -1
    if (a[name] > b[name]) return 1
    return 0
  }
}

// get credentials for SSL or not
const getCredentials = async (ca, key, cert, server = true) => {
  let credentials
  if (ca || key || cert) {
    if (!(ca && key && cert)) {
      console.error(chalk.red('SSL requires --ca, --key, & --cert\n'))
      return
    }
    credentials = grpc.credentials.createSsl(await fs.readFile(ca), [{
      cert_chain: await fs.readFile(cert),
      private_key: await fs.readFile(key)
    }], true)
  } else {
    credentials = grpc.credentials.createInsecure()
  }
  return credentials
}

async function handleLs ({ include, PROTO_FILES }) {
  const pkg = getProto(PROTO_FILES, include)
  Object.keys(pkg).forEach(p => {
    // it's a service
    if (!pkg[p].type) {
      Object.values(pkg[p]).sort(sortBy('path')).forEach(f => {
        const method = f.path.replace(/\/(.+)\/[0-9a-zA-Z_]+$/, '/' + chalk.yellow('$1') + '/' + chalk.green(f.path.split('/').pop()))
        let req = chalk.cyan(f.requestType.type.name)
        if (f.requestStream) {
          req = `~${req}`
        }
        let ret = chalk.cyan(f.responseType.type.name)
        if (f.responseStream) {
          ret = `~${ret}`
        }
        console.log(`${method} ( ${req} ) => ${ret}`)
        console.log(indent(`${chalk.cyan(f.requestType.type.name)}: ${jsoncolor(f.requestDeserialize(f.requestSerialize({})))}`, 2))
        console.log(indent(`${chalk.cyan(f.responseType.type.name)}: ${jsoncolor(f.responseDeserialize(f.responseSerialize({})))}`, 2))
        console.log('')
      })
    }
  })
}

async function handleServer ({ quiet, port, ca, key, cert, include, FILES }) {
  const pkg = getProto(FILES, include)
}

async function handleRun ({ host, ca, key, cert, command, include, PROTO_FILES }) {
  const pkg = getProto(PROTO_FILES, include)
  const proto = grpc.loadPackageDefinition(pkg)
  const [, service, method, params] = (/^\/([a-zA-Z.0-9]+)\/([a-zA-Z0-9]+)\((.+)\)$/gm).exec(command)
  const input = params ? JSON.parse(params) : {}
  const Client = get(proto, service)
  const client = new Client(host, await getCredentials(ca, key, cert, false))

  if (client[method].responseStream) {
    const call = client[method](input)
    call.on('data', d => console.log(jsoncolor(d)))
  } else {
    client[method](input, (err, res) => {
      if (err) return console.error(chalk.red(err.message))
      console.log(jsoncolor(res))
    })
  }
}

export default yargs
  .command(
    'server <FILES...>',
    'Start a gRPC server with proto and js files',
    yargs => {
      yargs
        .option('quiet', { type: 'boolean', alias: 'q', description: 'Suppress logs' })
        .option('port', { type: 'integer', alias: 'p', description: 'The port to run on', default: 50051 })
        .option('ca', { type: 'string', description: 'SSL CA cert' })
        .option('key', { type: 'string', description: 'SSL server key' })
        .option('cert', { type: 'string', description: 'SSL server certificate' })
        .example('$0 server -I proto/ helloworld.proto helloworld.js', 'Start a gRPC server')
    },
    handleServer
  )

  .command(
    'ls <PROTO_FILES...>',
    'List available services on the gRPC server',
    yargs => {
      yargs
        .example('$0 ls -I proto/ helloworld.proto', 'Get a list of available gRPCs')
    },
    handleLs
  )

  .command(
    'run <PROTO_FILES...>',
    'Call an RPC on the gRPC server',
    yargs => {
      yargs
        .option('command', { required: true, type: 'string', alias: 'c', description: 'The command to run' })
        .option('host', { type: 'string', alias: 'h', description: 'The host/port to run the gRPC server on', default: 'localhost:50051' })
        .option('ca', { type: 'string', description: 'SSL CA cert' })
        .option('key', { type: 'string', description: 'SSL server key' })
        .option('cert', { type: 'string', description: 'SSL server certificate' })
        .example('$0 run helloworld.proto -c \'/helloworld.v1.Greeter/SayHello({"name": "David"})\'', 'Call gRPC with a parameter. Parameter should be JSON.')
        .example('$0 run -I proto/ helloworld.proto helloworld.proto -c \'/helloworld.v1.Greeter/SayHello()\'', 'Call gRPC with no parameter & an include-path.')
    },
    handleRun
  )

  .demandCommand(1)
  .option('include', { type: 'string', alias: 'I', description: 'Include proto search path' })
  .help()
  .version().alias('v', 'version')
  .example('$0 ls --help', 'Get help with listing gRPC commands')
  .example('$0 run --help', 'Get help with running gRPC commands')
  .example('$0 server --help', 'Get help with running a gRPC server')
  .argv
