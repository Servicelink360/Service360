import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { message } from 'antd';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const TeamMeetingStart: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS, 'POST', {});
      if (cancelled) return;
      if (res?.code !== 1 || !res?.data?.id) {
        message.error(res?.message || 'Could not start the meeting');
        history.replace('/dashboard');
        return;
      }
      history.replace(`/meetings/${res.data.id}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [history]);

  return (
    <div style={{ padding: 24, fontSize: 18, fontWeight: 700 }}>
      Starting the meeting…
    </div>
  );
};

export default TeamMeetingStart;
