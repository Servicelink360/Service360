
import intl from '@app/lib/helpers/intlProvider'
const formatOrderStatus = (value: string) => {
    switch (value.toUpperCase()) {
        case 'FAIL':
            return intl.formatMessage({id: 'button.status.fail'});
        case 'NEW':
            return intl.formatMessage({id: 'button.status.new'});
        case 'ASSIGN':
            return intl.formatMessage({id: 'button.status.assigned'});
        case 'PARTIAL.COM':
            return intl.formatMessage({id: 'button.status.partialComplete'});
        case 'COMPLETED':
            return intl.formatMessage({id: 'button.status.completed'});
        case 'PICKED':
            return intl.formatMessage({id: 'button.status.picked'});
        case 'D':
            return intl.formatMessage({id: 'button.status.deleted'});
        case 'A': 
            return intl.formatMessage({id: 'button.status.active'})
        case 'I': 
            return intl.formatMessage({id: 'button.status.inActive'})
        case 'N': 
            return intl.formatMessage({id: 'button.status.new'})
        default:
            return value
    }
    
  }

export default formatOrderStatus