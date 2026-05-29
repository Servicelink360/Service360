import React from 'react';
import { ComponentTitleWrapper } from './pageHeader.style';

export default (props: any) => (
  <ComponentTitleWrapper className="isoComponentTitle">
    {props.children}
  </ComponentTitleWrapper>
);
