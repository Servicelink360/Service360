import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';

/** Legacy route — urgent reports live on Report Faults tab. */
const TasksFaultsRedirect: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  if (!tab || tab === 'tasks-faults') params.set('tab', 'urgent');
  const search = params.toString();
  return <Redirect to={`/report-faults${search ? `?${search}` : ''}`} />;
};

export default TasksFaultsRedirect;
