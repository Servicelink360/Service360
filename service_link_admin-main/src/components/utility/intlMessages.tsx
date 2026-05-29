import React from 'react';
import { injectIntl, FormattedMessage } from 'react-intl';

const InjectMassage = (props: any) => <FormattedMessage {...props} />;
export default injectIntl(InjectMassage, {
  // withRef: false,
  forwardRef: true
});
