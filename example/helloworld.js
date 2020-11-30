const wait = ms => new Promise((resolve) => setTimeout(resolve, ms))

export const helloworld = {
  v1: {
    Greeter: {
      SayHello: ({ request: { name } }) => ({ message: `Hello ${name}` }),

      // here is a promise-returning async handler
      SayGoodbye: async ({ request: { name } }) => {
        await wait(1000)
        return { message: `Bye, ${name}` }
      }
    }
  }
}
