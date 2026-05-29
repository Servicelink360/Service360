import { combineReducers } from 'redux';
import App from '@app/redux/app/reducer';
import Auth from '@app/redux/auth/reducer';
import profile from '@app/redux/profile/reducer';
import dashboard from '@app/redux/dashboard/reducer';
import admins from '@app/redux/admins/reducer'
import roles from '@app/redux/roles/reducer'
import settings from '@app/redux/settings/reducer'
import services from '@app/redux/services/reducer'
import companies from '@app/redux/companies/reducer'
import positions from '@app/redux/positions/reducer'
import groups from '@app/redux/groups/reducer'
import sites from '@app/redux/sites/reducer'
import reportTemplates from '@app/redux/report-templates/reducer'
import tasks from '@app/redux/tasks/reducer'
import tickets from '@app/redux/tickets/reducer'
import reportFaults from '@app/redux/report-faults/reducer'

export default combineReducers({
  Auth,
  App,
  profile, 
  dashboard, 
  admins,
  roles,
  settings,
  services,
  companies,
  positions,
  groups,
  sites,
  reportTemplates,
  tasks,
  tickets,
  reportFaults
});
