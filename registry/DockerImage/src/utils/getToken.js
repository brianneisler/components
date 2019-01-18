import { fetch } from '@serverless/utils'

async function getToken(username, password, registryUrl) {
  const result = await fetch(`${registryUrl}/v2/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      password
    })
  }).then((res) => res.json())
  return result.token
}

export default getToken
