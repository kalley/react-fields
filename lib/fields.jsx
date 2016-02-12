import _ from 'lodash'
import React, { PropTypes } from 'react'
import invariant from 'invariant'
import titleize from 'titleize'

// Default field components
import TextInput from './components/TextInput'
import NumberInput from './components/NumberInput'

const schemaPropType = PropTypes.objectOf(
  PropTypes.oneOfType([
    PropTypes.shape({
      title: PropTypes.string,
      type: PropTypes.string,
      rules: PropTypes.object,
      fieldComponent: PropTypes.func,
      fieldComponentProps: PropTypes.object
    }),
    schemaPropType
  ])
)

class Fields extends React.Component {

  static propTypes = {
    /**
     * The field schema
     */
    schema: schemaPropType.isRequired,
    render: PropTypes.func,
    /**
     * The field values
     */
    value: PropTypes.any.isRequired,
    /**
     * onChange(value, fieldName, fieldValue)
     */
    onChange: PropTypes.func,
    /**
     * The field error
     */
    error: PropTypes.object,
    /**
     * If true, renders the values without the field component
     */
    readOnly: PropTypes.bool,
    /**
     * If true, shows a label beside each field
     */
    showLabels: PropTypes.bool,
    /**
     * A hash of field type to component. These can be replaced with
     * field-level declarations as well.
     */
    fieldTypes: PropTypes.objectOf(
      PropTypes.shape({
        fieldComponent: PropTypes.func,
        fieldComponentProps: PropTypes.object
      })
    ),
    /**
     * An array of fields to display. If this is not specificed, all
     * fields will be displayed.
     */
    fields: PropTypes.array,
    fieldsContext: PropTypes.object,
    fieldComponentProps: PropTypes.object
  };

  static defaultProps = {
    fieldComponents: {},
    value: {}
  };

  changeField(fieldPath, fieldValue, fieldPathString) {
    // TODO: replace with immutable `_.set`
    // https://github.com/lodash/lodash/issues/1696
    const value = fieldPath ? _.set(
      Object.assign({}, this.props.value),
      fieldPath,
      fieldValue
    ) : fieldValue

    if (this.props.onChange) {
      this.props.onChange(value, fieldPathString, fieldValue, fieldPath)
    }
  }

  renderFieldWithProps(fieldPath, props) {
    return this.renderField(fieldPath, props)
  }

  renderFieldWithComponent(fieldPath, Component, props) {
    return this.renderField(fieldPath, props, Component)
  }

  getFieldData(fieldPath) {
    // Normalize the field path.
    let fieldPathString = null
    if (_.isString(fieldPath)) {
      fieldPathString = fieldPath
      fieldPath = fieldPath.split('.')
    }

    // Get and check the field schema.
    const fieldSchema = fieldPath
      ? _.get(this.props.schema, fieldPath)
      : this.props.schema

    invariant(
      !!fieldSchema,
      `render('${fieldPathString}') failed because the field "${fieldPathString}" `
        + `is not defined in the schema.`
    )

    // Get the error message.
    const fieldError = fieldPath
      ? _.get(this.props.error, fieldPath)
      : this.props.error

    // Get the field value.
    const value = fieldPath
      ? _.get(this.props.value, fieldPath)
      : this.props.value

    // Get the field type options.
    const fieldType = this.props.fieldTypes
      && this.props.fieldTypes[fieldSchema.type]

    return {
      fieldPath,
      fieldPathString,
      fieldSchema,
      fieldError,
      fieldType,
      value,
      onChange: fieldValue => (
        this.changeField(fieldPath, fieldValue, fieldPathString)
      )
    }
  }

  getPropsForFieldData(fieldData) {
    const { fieldSchema, fieldType } = fieldData

    return {
      value: fieldData.value,
      onChange: fieldData.onChange,
      error: fieldData.fieldError,
      schema: fieldData.fieldSchema,
      required: _.get(fieldData.fieldSchema, ['rules', 'required']),
      ...this.props.fieldComponentProps,
      ...fieldSchema.fieldComponentProps,
      ...(fieldType && fieldType.fieldComponentProps)
    }
  }

  propsFor(fieldPath) {
    const fieldData = this.getFieldData(fieldPath)
    return this.getPropsForFieldData(fieldData)
  }

  renderField(rawFieldPath, fieldProps, fieldComponent) {
    const fieldData = this.getFieldData(rawFieldPath)
    const props = this.getPropsForFieldData(fieldData)
    const {
      fieldSchema,
      fieldType,
      fieldPathString,
      fieldError
    } = fieldData

    const FieldComponent = fieldComponent
      || fieldSchema.fieldComponent
      || (fieldType && fieldType.fieldComponent)

    invariant(
      FieldComponent,
      `field "${fieldPathString}" has a type "${fieldSchema.type}" that does not `
        + `have a component`
    )

    /*
    const errorMessage = fieldError ? (
      <span className="Field-error">{fieldError}</span>
    ) : null
    */
    // TODO: decide if errors should be shown by default
    const errorMessage = null

    // TODO: merge fieldProps.onChange with props.onChange
    return (
      <div key={fieldPathString}>
        {errorMessage}
        <FieldComponent {...props} {...fieldProps}/>
      </div>
    )
  }

  // Renders the fields based on the schema with labels.
  renderAllFields() {
    const fieldNames = _.keys(this.props.schema)
    const sortedFieldNames = this.props.fields || _.sortBy(fieldNames)
    const items = _.map(sortedFieldNames, fieldName => (
      <div key={fieldName}>
        <label>
          {this.props.schema[fieldName].title || titleize(fieldName)}
        </label>
        {this.renderField(fieldName)}
      </div>
    ))

    return (<div>{items}</div>)
  }

  render() {
    return (this.props.render || ::this.renderAllFields)({
      render: ::this.renderFieldWithProps,
      renderComponent: ::this.renderFieldWithComponent,
      propsFor: ::this.propsFor,
      value: this.props.value,
      ...this.props.fieldsContext
    })
  }
}

/**
 * Creates a `renderFields` function with a specified set of base
 * options. If no options are specified, sensible defaults will be
 * used instead.
 *
 * @param {?Object} baseOptions - base options for `renderFields`
 */
export const createFieldRenderer = (baseOptions) => {
  return (schema, options, render) => (
    renderFields(
      schema, { ...baseOptions, ...options }, render
    )
  )
}

/**
 * A helper for rendering the `Fields` component.
 *
 * @param {Object} schema - `props.schema`
 * @param {?Object} options - `props`
 * @param {?Function} render - `props.render`
 */
export const renderFields = (schema, options, render) => {
  options = {
    fieldTypes: {
      string: {
        fieldComponent: TextInput
      },
      number: {
        fieldComponent: NumberInput
      }
    },
    ..._.pickBy(options, v => v)
  }

  return (
    <Fields
      schema={schema}
      render={render}
      {...options}
    />
  )
}
