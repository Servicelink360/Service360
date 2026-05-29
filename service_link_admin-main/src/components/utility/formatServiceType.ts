
import intl from '@app/lib/helpers/intlProvider'
const formatServiceType = (value: string) => {
    switch (value.toUpperCase()) {
        case 'MAINTENANCE':
            return intl.formatMessage({id: 'option.maintenance'});
        case 'URGENT':
            return intl.formatMessage({id: 'option.urgent'});
        default:
            return value
    }
  }

export default formatServiceType