import React, { useState } from 'react'

import { Mention, MentionsInput } from '../../../src'

import { provideExampleValue } from './higher-order'
import defaultStyle from './defaultStyle'
import defaultMentionStyle from './defaultMentionStyle'

function SingleLine(props) {
  const { value, data, onChange, onAdd } = props
  return (
    <div className="single-line">
      <h3>Single line input</h3>

      <MentionsInput
        className="dialog"
        highlightToTag
        preserveValue
        isAccordion
        value={value}
        onChange={onChange}
        style={defaultStyle}
        placeholder={"Mention people using '@'"}
      >
        <Mention
          trigger="["
          displayTransform={(_, display) => display}
          data={data}
          onAdd={onAdd}
          style={defaultMentionStyle} />
      </MentionsInput>
    </div>
  )
}

const asExample = provideExampleValue('')

export default asExample(SingleLine)
