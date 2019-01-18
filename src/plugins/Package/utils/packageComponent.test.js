import utils from '@serverless/utils'
import path from 'path'
import { createTestContext } from '../../../../test'
const packageComponent = require('./packageComponent')

jest.mock('@serverless/utils', () => ({
  ...require.requireActual('@serverless/utils'),
  fileExists: jest.fn(),
  packDir: jest.fn(),
  readFile: jest.fn()
}))

afterAll(() => {
  jest.restoreAllMocks()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('#packageComponent()', () => {
  beforeEach(() => {
    utils.packDir.mockImplementation(() => Promise.resolve())
  })

  it('should package a component based on a serverlessFileObject', async () => {
    const context = await createTestContext({ cwd: __dirname })
    const options = {
      projectPath: process.cwd(),
      path: './some-path',
      format: 'zip',
      serverlessFileObject: {
        type: 'my-project',
        version: '0.0.1',
        components: {
          iamMock: { id: 'iam-mock-id', type: 'iam-mock' }
        }
      }
    }

    await packageComponent(options, context)
    const componentPath = path.join(process.cwd(), 'some-path')
    const outputFilePath = path.resolve(componentPath, 'my-project@0.0.1.zip')
    expect(utils.packDir).toBeCalledWith(componentPath, outputFilePath)
    expect(utils.fileExists).not.toBeCalled()
    expect(utils.readFile).not.toBeCalled()
  })

  it('should package component at given relative path', async () => {
    const context = await createTestContext({ cwd: __dirname })
    utils.fileExists.mockReturnValue(Promise.resolve(true))
    utils.readFile.mockReturnValue(Promise.resolve({ type: 'my-project', version: '0.0.1' }))

    const options = {
      projectPath: process.cwd(),
      path: './some-path',
      format: 'zip'
    }

    await packageComponent(options, context)
    const componentPath = path.join(process.cwd(), 'some-path')
    const slsYmlFilePath = path.join(componentPath, 'serverless.yml')
    const outputFilePath = path.resolve(componentPath, 'my-project@0.0.1.zip')
    expect(utils.packDir).toBeCalledWith(componentPath, outputFilePath)
    expect(utils.fileExists).toBeCalledWith(slsYmlFilePath)
    expect(utils.readFile).toBeCalledWith(slsYmlFilePath)
  })

  it('should package component at given absolute path', async () => {
    const context = await createTestContext({ cwd: __dirname })
    utils.fileExists.mockReturnValue(Promise.resolve(true))
    utils.readFile.mockReturnValue(Promise.resolve({ type: 'my-project', version: '0.0.1' }))

    const options = {
      projectPath: process.cwd(),
      path: '/home/some-path',
      format: 'zip'
    }

    await packageComponent(options, context)
    const componentPath = '/home/some-path'
    const slsYmlFilePath = path.join(componentPath, 'serverless.yml')
    const outputFilePath = path.resolve(componentPath, 'my-project@0.0.1.zip')
    expect(utils.packDir).toBeCalledWith(componentPath, outputFilePath)
    expect(utils.fileExists).toBeCalledWith(slsYmlFilePath)
    expect(utils.readFile).toBeCalledWith(slsYmlFilePath)
  })

  it('validate package path', async () => {
    const context = await createTestContext({ cwd: __dirname })
    utils.fileExists.mockReturnValue(Promise.resolve(false))

    const componentPath = '/home/some-path'
    const options = {
      projectPath: process.cwd(),
      path: componentPath,
      format: 'zip'
    }
    let err
    try {
      await packageComponent(options, context)
    } catch (e) {
      err = e
    }
    expect(err.message).toEqual(`Could not find a serverless.yml file in ${componentPath}`)
  })
})
