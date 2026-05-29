import { ReloadOutlined } from '@ant-design/icons';
import { ActionBtn, ActionListBtn } from '@app/components/common/Common.styles';
import Layout from '@app/components/layout/Layout';
import TableComponent from '@app/components/common/Table/index';
import { ButtonDiv, InformationDiv, UsersDiv } from '@app/components/common/container.style';
import { notification } from '@app/components';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { getStaffLocation } from '@app/library/helpers/geolocation';
import { ColDef } from 'ag-grid-community';
import { Popconfirm, Tag } from 'antd';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

type SiteRow = {
  id: number;
  name: string;
  location?: string;
  addressName?: string;
  checkInDistance?: number;
  openCheckInId?: number | null;
  isCheckedIn?: boolean;
  checkInTime?: string | null;
};

const SiteCheckIn: React.FC = () => {
  const intl = useIntl();
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSiteId, setActionSiteId] = useState<number | null>(null);

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/getSitesByStaff`,
        'GET',
      );
      if (res?.data?.rows) {
        setRows(res.data.rows);
      } else {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const postAttendance = useCallback(
    async (site: SiteRow, type: 1 | 2) => {
      setActionSiteId(site.id);
      try {
        const staffLocation = await getStaffLocation();
        if ((site.checkInDistance ?? 0) > 0 && !staffLocation) {
          notification(
            'error',
            'Enable location access to check in at this job site',
          );
          return;
        }
        const body: Record<string, unknown> = {
          siteId: site.id,
          siteLocation: staffLocation || site.location || '',
          staffLocation: staffLocation || '',
          type,
        };
        if (type === 2) {
          body.checkInId = site.openCheckInId;
        }
        const res = await callAPIAsync(
          serviceType.COMMON,
          endPoint.USER_DAILY_JOBS,
          'POST',
          body,
        );
        if (res?.code === 1) {
          notification('success', type === 1 ? 'Checked in' : 'Checked out');
          await loadSites();
        } else {
          notification('error', res?.message || 'Request failed');
        }
      } finally {
        setActionSiteId(null);
      }
    },
    [loadSites],
  );

  const columns: ColDef[] | any = useMemo(
    () => [
      {
        title: 'Job site',
        dataIndex: 'name',
        width: 220,
      },
      {
        title: 'Address',
        dataIndex: 'addressName',
        width: 260,
      },
      {
        title: 'Status',
        dataIndex: 'isCheckedIn',
        width: 140,
        render: (_: unknown, row: SiteRow) =>
          row.isCheckedIn ? (
            <Tag color="#F44336">Checked in</Tag>
          ) : (
            <Tag color="default">Not checked in</Tag>
          ),
      },
      {
        title: 'Since',
        dataIndex: 'checkInTime',
        width: 120,
        render: (_: unknown, row: SiteRow) =>
          row.checkInTime
            ? moment(row.checkInTime).utcOffset('+10:00').format('HH:mm')
            : '—',
      },
      {
        title: 'Action',
        dataIndex: 'action',
        width: 160,
        align: 'center',
        fixed: 'right',
        render: (_: unknown, row: SiteRow) => {
          const busy = actionSiteId === row.id;
          if (!row.isCheckedIn) {
            return (
              <Popconfirm
                title="Check in at this job site?"
                okText={intl.formatMessage({ id: 'button.Yes' })}
                cancelText={intl.formatMessage({ id: 'button.No' })}
                onConfirm={() => postAttendance(row, 1)}
              >
                <ActionBtn type="primary" loading={busy}>
                  Check in
                </ActionBtn>
              </Popconfirm>
            );
          }
          return (
            <Popconfirm
              title="Check out from this job site?"
              okText={intl.formatMessage({ id: 'button.Yes' })}
              cancelText={intl.formatMessage({ id: 'button.No' })}
              onConfirm={() => postAttendance(row, 2)}
            >
              <ActionBtn
                type="secondary"
                loading={busy}
                style={{ backgroundColor: '#F44336', color: '#fff' }}
              >
                Check out
              </ActionBtn>
            </Popconfirm>
          );
        },
      },
    ],
    [intl, actionSiteId, postAttendance],
  );

  return (
    <Layout title="sidebar.siteCheckIn" subtitle="siteCheckIn.subtitle">
      <UsersDiv>
        <ButtonDiv>
          <ActionListBtn
            type="primary"
            onClick={loadSites}
            loading={loading}
            icon={<ReloadOutlined />}
          >
            Refresh
          </ActionListBtn>
        </ButtonDiv>
        <InformationDiv>
          <TableComponent
            heightTable="650px"
            pagination={false}
            columns={columns}
            keys="id"
            page={1}
            count={rows.length}
            limit={100}
            data={rows}
            loading={loading}
          />
        </InformationDiv>
      </UsersDiv>
    </Layout>
  );
};

export default SiteCheckIn;
