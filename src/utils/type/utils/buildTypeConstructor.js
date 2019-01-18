import { assign, clone, get, objectDefineProperty } from '@serverless/utils'
import { SYMBOL_TYPE } from '../../constants'
import interpretProps from '../../interpreter/interpretProps'

const buildTypeConstructor = (type) => {
  // construction process
  // 1) lowest level constructor needs to fire first, so we dive using super calls to get to the bottom immediately
  // 2) the constructor methods on classes are held in reference
  // 3) Properties for each layer are resolved before calling the constructor methods
  // 4) properties at the parent type level should be resolved before resolving child props

  const constructor = class extends type.class {
    constructor(inputs, context) {
      const { Type } = context
      const { props, parent } = Type

      // NOTE BRN: call super constructors first so that we dive to the bottom of the class constructor heirarchy and build our instance from the bottom up, first resolving props on the base classes and layering the higher level class's props on top of the lower level ones. This allows for overriding the lower level props.
      super(inputs, context.merge({ Type: parent, root: get('root', parent) }))

      // NOTE BRN: set the type onto the instance so that we can use it in cases of reflection.
      this[SYMBOL_TYPE] = Type

      // NOTE BRN: In this step we interpret the properties from serverless.yml. Here we convert variables to variable instances, apply type definitions and convert type/inputs combos to instances.
      const selfProps = interpretProps(
        // NOTE BRN: We clone the properties here so that we don't change the base property descriptions from the Type
        clone(props),
        {
          // NOTE BRN: Variables are eventually resolved using the current context and current reference to 'this' since all the values in props are references to the execution context of the current instance.
          this: this,
          self: this,
          context,
          root: context.root,
          path: context.root,

          // NOTE BRN: variables in inputs should already be interpreted to variable instances outside of the call to this constructor method. There should be no need to interpret them again here.
          inputs
        },
        context
      )

      // NOTE BRN: We set all props onto the instance after they have been resolved. We use the getOwnPropertyDescriptor and defineProperty so that we properly pass getters that may exist in the properties from the property resolution step
      assign(this, selfProps)
    }
  }

  // NOTE BRN: This sets the JS name for this constructor method. This will ensure that when this value is logged it will show up as '[name] { ... }'
  objectDefineProperty(constructor, 'name', { value: type.props.name })

  return constructor
}

export default buildTypeConstructor
