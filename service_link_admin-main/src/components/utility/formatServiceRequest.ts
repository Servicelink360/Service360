
import intl from '@app/lib/helpers/intlProvider'
const formatServiceRequest = (value: string) => {
    switch (value.toUpperCase()) {
        case 'FORKLIFT':
            return intl.formatMessage({id: 'option.noFolkLift'});
        case 'LOADINGBAY':
            return intl.formatMessage({id: 'option.noLoadingBay'});
        case 'DG':
            return intl.formatMessage({id: 'option.dgCargo'});
        case 'PASS':
            return intl.formatMessage({id: 'option.securedZone'});
        case 'LABOUR':
            return intl.formatMessage({id: 'option.labourSupport'});
        case 'EXTHANDLE':
            return intl.formatMessage({id: 'option.fragile'});
        case 'SN':
            return intl.formatMessage({id: 'option.serialNumber'});
        default:
            return value
    }
  }

export default formatServiceRequest