
import intl from '@app/lib/helpers/intlProvider'
const formatSubmitType = (value: string) => {
    switch (value.toUpperCase()) {
        case 'FUELTOPUP':
            return intl.formatMessage({id: 'option.fuelTopup'});
        case 'GENERAL':
            return intl.formatMessage({id: 'option.generalReimbursement'});
        default:
            return value
    }
  }

export default formatSubmitType