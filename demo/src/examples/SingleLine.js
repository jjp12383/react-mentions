import React, { useState } from 'react'
import ClickAwayListener from '@material-ui/core/ClickAwayListener'

import { Mention, MentionsInput } from '../../../src'

import { provideExampleValue } from './higher-order'
import defaultStyle from './defaultStyle'
import defaultMentionStyle from './defaultMentionStyle'

function SingleLine(props) {
  const { value, data, onChange, onAdd } = props
  const [focused, setFocused] = useState(false)
  const handleClickAway = () => {
    setFocused(false)
  }
  const displayTransform = (_, display) => {
    return display
  }
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className="single-line">
        <h3>Single line input</h3>

        <MentionsInput
          className="dialog"
          focused={focused}
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
            displayTransform={displayTransform}
            markup='[__id__|__display__(__metaData__)]'
            data={data}
            onAdd={onAdd}
            style={defaultMentionStyle} />
        </MentionsInput>
      </div>
    </ClickAwayListener>
  )
}

const asExample = provideExampleValue('')

export default asExample(SingleLine)
