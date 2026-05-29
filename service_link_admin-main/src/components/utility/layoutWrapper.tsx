import React from 'react';
import { LayoutContentWrapper } from './layoutWrapper.style';

export default (props: any) => (
  <LayoutContentWrapper
    className={
      props.className != null
        ? `${props.className} isoLayoutContentWrapper`
        : 'isoLayoutContentWrapper'
    }
    {...props}
  >
    {props.children}
  </LayoutContentWrapper>
);
