import { pick, resolve } from '@serverless/utils'

const Function = {
  async define(context) {
    const compute = resolve(this.compute)
    return { fn: await compute.defineFunction(this, context) }
  },

  getId() {
    return this.children.fn.getId()
  },

  async info() {
    return {
      title: this.functionName,
      type: this.name,
      data: pick(
        [
          'environment',
          'functionDescription',
          'functionName',
          'memory',
          'ufs',
          'timeout',
          'runtime',
          'tags'
        ],
        this
      )
    }
  }
}

export default Function
