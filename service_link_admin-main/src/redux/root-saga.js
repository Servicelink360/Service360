import { all } from 'redux-saga/effects';
import appSaga from '@app/redux/app/saga'
import authSagas from '@app/redux/auth/saga';
import profileSaga from '@app/redux/profile/saga';
import dashboardSaga from '@app/redux/dashboard/saga'
import adminsSaga from '@app/redux/admins/saga'
import rolesSaga from '@app/redux/roles/saga'
import settingsSaga from '@app/redux/settings/saga'
import ServicesSaga from '@app/redux/services/saga'
import companiesSaga from '@app/redux/companies/saga'
import positionsSaga from '@app/redux/positions/saga'
import groupsSaga from '@app/redux/groups/saga'
import sitesSaga from '@app/redux/sites/saga'
import reportTemplatesSaga from '@app/redux/report-templates/saga'
import tasksSaga from '@app/redux/tasks/saga'
import ticksSaga from '@app/redux/tickets/saga'
import reportFaultsSaga from '@app/redux/report-faults/saga'
export default function* rootSaga(getState) {
  yield all([
    authSagas(),
    appSaga(),
    profileSaga(),
    dashboardSaga(),
    adminsSaga(),
    rolesSaga(),
    settingsSaga(),
    ServicesSaga(),
    companiesSaga(),
    positionsSaga(), 
    groupsSaga(),
    sitesSaga(),
    reportTemplatesSaga(),
    tasksSaga(),
    ticksSaga(),
    reportFaultsSaga()
  ]);
}
