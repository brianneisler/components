import { concat, forEach, isObject, resolve, walk } from '@serverless/utils'

const walkee = (accum, component, keys, iteratee, recur) => {
  let result = accum
  const children = resolve(component.children)
  if (isObject(children)) {
    forEach((child, childKdx) => {
      const newKeys = concat(keys, [childKdx])
      result = recur(result, resolve(child), newKeys, iteratee)
    }, children)
  }
  return iteratee(result, component, keys)
}

/**
 * Walk depth first and reduce using the given reducer function
 *
 * @func
 * @param {Function} iteratee The iterator function. Receives three values, the accumulator and the current component from the walk and the current set of keys from the entire depth of the walk.
 * @param {*} accum The accumulator value.
 * @param {Component} component The component to walk.
 * @returns {*} The final, accumulated value.
 */
const walkReduceComponentChildrenDepthFirst = (iteratee, accum, component) =>
  walk(walkee, iteratee, accum, component, [])

export default walkReduceComponentChildrenDepthFirst
