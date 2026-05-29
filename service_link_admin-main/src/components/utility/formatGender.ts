
import intl from '@app/lib/helpers/intlProvider'
const formatGender = (value: string) => {
    switch (value.toUpperCase()) {
        case 'F':
            return intl.formatMessage({id: 'option.female'});
        case 'M':
            return intl.formatMessage({id: 'option.male'});
        default:
            return value
    }
  }

export default formatGender