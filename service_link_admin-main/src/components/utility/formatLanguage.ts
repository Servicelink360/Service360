
import intl from '@app/lib/helpers/intlProvider'
const formatLanguage = (value: string) => {
    switch (value.toUpperCase()) {
        case 'CN':
            return intl.formatMessage({id: 'option.chinese'});
        case 'EN':
            return intl.formatMessage({id: 'option.english'});
        case 'VI':
            return intl.formatMessage({id: 'option.vietnamese'});
        default:
            return value
    }
  }

export default formatLanguage