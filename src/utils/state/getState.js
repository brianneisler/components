import getStateObject from './getStateObject'

const getState = (query, state) => {
  const stateObject = getStateObject(query, state)
  if (stateObject && stateObject.state) {
    return stateObject.state || {}
  }
  return {}
}

export default getState
