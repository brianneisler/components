import { forEach, not } from '@serverless/utils'
import graphlib from 'graphlib'

const detectCircularDeps = (graph) => {
  const isAcyclic = graphlib.alg.isAcyclic(graph)
  if (not(isAcyclic)) {
    const cycles = graphlib.alg.findCycles(graph)
    let msg = ['Your serverless.yml file has circular dependencies:']
    forEach((cycle, index) => {
      let fromAToB = cycle.join(' --> ')
      fromAToB = `${(index += 1)}. ${fromAToB}`
      const fromBToA = cycle.reverse().join(' <-- ')
      const padLength = fromAToB.length + 4
      msg.push(fromAToB.padStart(padLength))
      msg.push(fromBToA.padStart(padLength))
    }, cycles)
    msg = msg.join('\n')
    throw new Error(msg)
  }
  return graph
}

export default detectCircularDeps
