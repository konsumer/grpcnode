module.exports = {
  helloworld: {
    v1: {
      Greeter: {
        SayHello: ({request: { name }}) => ({message: `Hello ${name}`}),
        SayGoodbye: ({request: { name }}) => ({message: `Bye, ${name}`})
      }
    }
  }
}
