import React from 'react';
import { ContentHolderWrapper } from './contentHolder.style';

export default (props: any) => (
  <ContentHolderWrapper className="isoExampleWrapper" style={props.style}>
    {props.children}
  </ContentHolderWrapper>
);
