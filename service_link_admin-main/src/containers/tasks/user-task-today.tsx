import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

/**
 * Legacy staff task screen. All staff work now lives on /my-tasks.
 * Keep this route so old bookmarks and emails still land correctly.
 */
const UserTaskTodayRedirect: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    const status = new URLSearchParams(location.search).get('status');
    history.replace(status === 's' ? '/my-tasks?view=done' : '/my-tasks');
  }, [history, location.search]);

  return null;
};

export default UserTaskTodayRedirect;
