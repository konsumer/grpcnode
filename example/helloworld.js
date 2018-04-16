module.exports = {
  helloworld: {
    v1: {
      Greeter: {
        SayHello: ({request: { name }}) => ({message: `Hello ${name}`}),
        SayGoodbye: ({request: { name }}) => new Promise((resolve) => {
          setTimeout(() => {
            resolve({message: `Bye, ${name}`})
          }, 1000)
        })
      }
    }
  }
}
