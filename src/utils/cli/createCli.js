import newCli from './newCli'

const createCli = async (context) => {
  context.log('Loading plugins...')
  context = await context.loadPlugins()
  return newCli(context)
}

export default createCli
