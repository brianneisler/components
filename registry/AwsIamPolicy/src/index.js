import { get, all, sleep, map, resolve, pick, keys, not, equals } from '@serverless/utils'

const createPolicy = async (IAM, { policyName, document }) => {
  const policyRes = await IAM.createPolicy({
    PolicyName: policyName,
    Path: '/',
    PolicyDocument: JSON.stringify(document)
  }).promise()

  await sleep(15000)

  return policyRes.Policy.Arn
}

const deletePolicy = async (IAM, arn) => {
  const { PolicyGroups, PolicyRoles, PolicyUsers } = await IAM.listEntitiesForPolicy({
    PolicyArn: arn
  }).promise()

  await all([
    all(
      map(
        (group) => IAM.detachGroupPolicy({ GroupName: group.GroupName, PolicyArn: arn }).promise(),
        PolicyGroups
      )
    ),
    all(
      map(
        (role) => IAM.detachRolePolicy({ RoleName: role.RoleName, PolicyArn: arn }).promise(),
        PolicyRoles
      )
    ),
    all(
      map(
        (user) => IAM.detachUserPolicy({ UserName: user.UserName, PolicyArn: arn }).promise(),
        PolicyUsers
      )
    )
  ])

  // delete non default versions...
  const listPolicyVersionRes = await IAM.listPolicyVersions({
    PolicyArn: arn
  }).promise()

  const nonDefaultVersions = listPolicyVersionRes.Versions.filter(
    (version) => !version.IsDefaultVersion
  )

  await all(
    map(
      (version) =>
        IAM.deletePolicyVersion({
          PolicyArn: arn,
          VersionId: version.VersionId
        }).promise(),
      nonDefaultVersions
    )
  )

  // then delete the policy with its default version...
  await IAM.deletePolicy({
    PolicyArn: arn
  }).promise()

  return null
}

const AwsIamPolicy = (SuperClass) =>
  class extends SuperClass {
    hydrate(prevInstance) {
      super.hydrate(prevInstance)
      this.arn = get('arn', prevInstance)
    }

    async sync() {
      let { provider } = this
      provider = resolve(provider)
      const accountId = await provider.getAccountId()
      const AWS = provider.getSdk()
      const IAM = new AWS.IAM()

      try {
        // first, we get the policy to know the latest version...
        const getPolicyParams = {
          PolicyArn: `arn:aws:iam::${accountId}:policy/${resolve(this.policyName)}`
        }
        const getPolicyRes = await IAM.getPolicy(getPolicyParams).promise()

        // second, we fetch that latest version
        const getPolicyVersionParams = {
          PolicyArn: `arn:aws:iam::${accountId}:policy/${resolve(this.policyName)}`,
          VersionId: getPolicyRes.Policy.DefaultVersionId
        }
        const getPolicyVersionRes = await IAM.getPolicyVersion(getPolicyVersionParams).promise()

        this.document = JSON.parse(decodeURIComponent(getPolicyVersionRes.PolicyVersion.Document))
      } catch (e) {
        if (e.code === 'NoSuchEntity') {
          return 'removed'
        }
        throw e
      }
    }

    shouldDeploy(prevInstance) {
      const inputs = {
        document: this.document
      }
      const prevInputs = prevInstance ? pick(keys(inputs), prevInstance) : {}
      const configChanged = not(equals(inputs, prevInputs))

      // make sure any added suffix from prevInstance is preserved
      // otherwise name will always be different
      if (
        prevInstance &&
        this.policyName === `policy-${this.instanceId}` &&
        prevInstance.policyName.includes(`policy-${this.instanceId}`)
      ) {
        this.policyName = prevInstance.policyName
      }
      // if config changed, change the name to trigger replace
      if (prevInstance && configChanged && this.policyName.includes(`policy-${this.instanceId}`)) {
        this.policyName = `policy-${this.instanceId}-${Math.random()
          .toString(36)
          .substring(7)}`
      }

      // if the user changed the config without changing the name, error!
      if (prevInstance && configChanged && prevInstance.policyName === this.policyName) {
        throw Error(
          'Deployed policies cannot be updated. Please change the policyName to replace the policy document.'
        )
      }

      if (!prevInstance) {
        return 'deploy'
      } else if (prevInstance.policyName !== this.policyName) {
        return 'replace'
      }
    }

    async deploy(prevInstance, context) {
      const AWS = this.provider.getSdk()
      const IAM = new AWS.IAM()

      context.log(`Creating Policy: ${this.policyName}`)
      this.arn = await createPolicy(IAM, {
        policyName: this.policyName,
        document: this.document
      })
      context.log(`Policy '${this.policyName}' created with arn: '${this.arn}'`)
    }

    async remove(context) {
      const AWS = this.provider.getSdk()
      const IAM = new AWS.IAM()

      try {
        context.log(`Removing Policy: ${this.policyName}`)
        await deletePolicy(IAM, this.arn)
        context.log(`Policy '${this.policyName}' removed.`)
      } catch (error) {
        if (error.code !== 'NoSuchEntity') {
          throw error
        }
      }
    }

    async info() {
      return {
        title: this.policyName,
        type: this.name,
        data: {
          arn: this.arn
        }
      }
    }
  }

export default AwsIamPolicy
