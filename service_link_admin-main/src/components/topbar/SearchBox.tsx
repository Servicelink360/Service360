import React from 'react';
import { InputSearch } from '../uielements/input';
export default function (props: any) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        (document.getElementById('InputTopbarSearch') as HTMLElement).focus();
      } catch (e) { }
    }, 200);
    return () => {
      clearTimeout(timer);
    };
  });
  return (
    <InputSearch
      id="InputTopbarSearch"
      size="large"
      // placeholder="Enter search text"
      onBlur={props.onBlur}
    />
  );
}
