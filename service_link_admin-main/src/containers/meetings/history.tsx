import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { useColorModeOptional } from '@app/context/ColorModeContext';
import { callAPIAsync } from '@app/library/helpers/api';
import useMobilePortrait from '@app/library/hooks/useMobilePortrait';
import { DownOutlined, FilterOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons';
import { Button, DatePicker, Empty, Form, Input, Spin, Table } from 'antd';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

const { RangePicker } = DatePicker;

type Attendee = {
  userId: number;
  name: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
};

type MeetingRow = {
  id: number;
  hostName: string;
  startedAt: string;
  endedAt: string | null;
  attended: Attendee[];
};

const ListChromeStyles = createGlobalStyle`
  .mh-list-page { width: 100%; max-width: 100%; box-sizing: border-box; }
  .mh-list-chrome {
    width: 100%;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 16px 14px;
  }
  .mh-list-chrome-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .mh-list-chrome-title {
    margin: 0 0 2px;
    font-size: 22px;
    font-weight: 700;
    color: #166534;
    line-height: 1.2;
  }
  .mh-list-chrome-sub { margin: 0; font-size: 12px; color: #6b7280; }
  .mh-toolbar-card {
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 12px 12px 10px;
    width: 100%;
    box-sizing: border-box;
  }
  .mh-toolbar-form {
    display: grid !important;
    grid-template-columns: minmax(220px, 1.2fr) minmax(180px, 1fr) max-content;
    gap: 12px;
    align-items: end;
  }
  .mh-toolbar-form .ant-form-item { margin: 0 !important; }
  .mh-toolbar-form .ant-form-item-label { padding-bottom: 4px !important; }
  .mh-toolbar-form .ant-form-item-label > label {
    font-size: 11px !important;
    font-weight: 600;
    color: #6b7280 !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    height: auto !important;
  }
  .mh-toolbar-form .ant-picker,
  .mh-toolbar-form .ant-input-affix-wrapper,
  .mh-toolbar-form .ant-input {
    width: 100% !important;
    border-radius: 8px !important;
  }
  .mh-toolbar-actions .ant-form-item-control-input-content {
    display: flex;
    align-items: center;
  }
  .mh-btn-search.ant-btn {
    background: #188038 !important;
    border-color: #188038 !important;
    color: #fff !important;
    border-radius: 8px;
    height: 36px;
    padding: 0 16px;
    font-weight: 600;
  }
  .mh-list-table-panel {
    width: 100%;
    box-sizing: border-box;
    margin-top: 14px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .mh-list-table-panel--mobile {
    border: none;
    background: transparent;
    border-radius: 0;
    overflow: visible;
  }
  .mh-list-table-panel .ant-table-thead > tr > th {
    background: #188038 !important;
    color: #fff !important;
    font-weight: 600;
    border-bottom: none !important;
  }
  .mh-list-table-panel .ant-table.ant-table-bordered > .ant-table-container,
  .mh-list-table-panel .ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table {
    border: none !important;
  }
  .mh-list-table-panel .ant-table-pagination { margin: 12px 16px !important; }
  .mh-list-page--mobile { background: #e7f0e4; }
  .mh-list-page--dark .mh-list-chrome,
  .mh-list-page--dark .mh-list-table-panel {
    background: #0a0a0a;
    border-color: #2e2e2e;
  }
  .mh-list-page--dark .mh-list-chrome-title { color: #86efac; }
  .mh-list-page--dark .mh-toolbar-card {
    background: #141414;
    border-color: #444444;
  }
  .mh-list-page--dark { background: #000000; }
  @media (max-width: 768px) {
    .mh-toolbar-form { grid-template-columns: 1fr !important; }
  }
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 12px 0 24px;
  background: ${(p: any) => (p.$dark ? '#000000' : '#e7f0e4')};
` as any;

const Card = styled.article`
  background: ${(p: any) => (p.$dark ? '#1e1e1e' : '#ffffff')};
  border: 2px solid ${(p: any) => (p.$dark ? '#525252' : '#b7d0b0')};
  border-radius: 12px;
  box-shadow: ${(p: any) => (p.$dark ? '0 8px 28px rgba(0,0,0,0.85)' : '0 4px 16px rgba(31, 107, 58, 0.12)')};
  overflow: hidden;
` as any;

const CardHead = styled.div`
  padding: 14px 14px 12px;
  border-bottom: 1px solid ${(p: any) => (p.$dark ? '#404040' : '#b7d0b0')};
  background: ${(p: any) => (p.$dark ? '#1e1e1e' : '#f4faf3')};
` as any;

const CardTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  color: ${(p: any) => (p.$dark ? '#ffffff' : '#143d24')};
` as any;

const CardSite = styled.div`
  margin-top: 6px;
  font-size: 15px;
  color: ${(p: any) => (p.$dark ? '#b0b0b0' : '#3d6b4a')};
` as any;

const CardDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${(p: any) => (p.$dark ? '#141414' : '#d7e8d2')};
` as any;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  font-size: 15px;
  line-height: 1.4;
`;

const DetailLabel = styled.span`
  flex-shrink: 0;
  color: ${(p: any) => (p.$dark ? '#d0d6de' : '#3d6b4a')};
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
` as any;

const DetailValue = styled.span`
  text-align: right;
  color: ${(p: any) => (p.$dark ? '#ffffff' : '#143d24')};
  font-weight: 600;
  word-break: break-word;
` as any;

function sydney(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function personWhen(person: Attendee) {
  const who = `${person.name}${person.role ? ` (${person.role})` : ''}`;
  const span = person.leftAt
    ? `${sydney(person.joinedAt)} to ${sydney(person.leftAt)}`
    : `${sydney(person.joinedAt)} · still in the meeting`;
  return `${who} — ${span}`;
}

function useNarrow() {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setNarrow(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);
  return narrow;
}

const MeetingHistory: React.FC = () => {
  const narrow = useNarrow();
  const isMobilePortrait = useMobilePortrait();
  const { isDark } = useColorModeOptional();
  const dark = isDark && (isMobilePortrait || narrow);
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [range, setRange] = useState<any>(null);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const clearMeetings = async () => {
    if (!window.confirm('Clear every team meeting, invitation, and the meeting history?')) return;
    const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_CLEAR, 'POST', {});
    if (!res || res.code !== 1) {
      setNotice((res && res.message) || 'Could not clear meetings');
      return;
    }
    setRows([]);
    setNotice('');
    setReloadKey((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_HISTORY, 'GET', null);
      if (cancelled) return;
      if (!res || res.code !== 1 || !Array.isArray(res.data)) {
        setNotice((res && res.message) || 'Could not load meeting history');
        setLoading(false);
        return;
      }
      setRows(res.data);
      setNotice('');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = appliedKeyword.trim().toLowerCase();
    return rows.filter((meeting) => {
      if (range && range[0] && range[1]) {
        const started = moment(meeting.startedAt);
        if (started.isBefore(range[0].clone().startOf('day')) || started.isAfter(range[1].clone().endOf('day'))) {
          return false;
        }
      }
      if (!q) return true;
      const blob = [
        meeting.hostName,
        ...meeting.attended.flatMap((person) => [person.name, person.role]),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, range, appliedKeyword]);

  const columns = [
    {
      title: 'Meeting',
      dataIndex: 'id',
      width: 160,
      render: (value: number) => `Team Meeting ${value}`,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      width: 190,
      render: (value: string) => sydney(value) || '—',
    },
    {
      title: 'Ended',
      dataIndex: 'endedAt',
      width: 190,
      render: (value: string | null) => (value ? sydney(value) : 'Still open'),
    },
    {
      title: 'Started by',
      dataIndex: 'hostName',
      width: 180,
      render: (value: string) => value || '—',
    },
    {
      title: 'Attended',
      key: 'attended',
      render: (_: unknown, meeting: MeetingRow) =>
        meeting.attended.length === 0 ? (
          'No one joined'
        ) : (
          <div>
            {meeting.attended.map((person) => (
              <div key={`${person.userId}-${person.joinedAt}`} style={{ marginBottom: 4 }}>
                {personWhen(person)}
              </div>
            ))}
          </div>
        ),
    },
  ];

  const emptyText = notice || (appliedKeyword || range ? 'No meetings match your search' : 'No meetings yet');

  const renderCards = () => {
    if (loading) return <Spin style={{ display: 'block', margin: '32px auto' }} />;
    if (filtered.length === 0) return <Empty description={emptyText} style={{ margin: '32px 0' }} />;
    return (
      <CardList $dark={dark}>
        {filtered.map((meeting) => (
          <Card key={meeting.id} $dark={dark}>
            <CardHead $dark={dark}>
                        <CardTitle $dark={dark}>{`Team Meeting ${meeting.id}`}</CardTitle>
                        <CardSite $dark={dark}>{sydney(meeting.startedAt)} · Started by {meeting.hostName}</CardSite>
            </CardHead>
            <CardDetails $dark={dark}>
              <DetailRow>
                <DetailLabel $dark={dark}>Ended</DetailLabel>
                <DetailValue $dark={dark}>{meeting.endedAt ? sydney(meeting.endedAt) : 'Still open'}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel $dark={dark}>Attended</DetailLabel>
                <DetailValue $dark={dark}>
                  {meeting.attended.length === 0
                    ? 'No one joined'
                    : meeting.attended.map((person) => (
                        <div key={`${person.userId}-${person.joinedAt}`}>{personWhen(person)}</div>
                      ))}
                </DetailValue>
              </DetailRow>
            </CardDetails>
          </Card>
        ))}
      </CardList>
    );
  };

  return (
    <Layout title="">
      <ListChromeStyles />
      <UsersDiv
        style={
          dark
            ? { background: '#000000', width: '100%', padding: '0 12px 72px', boxSizing: 'border-box' }
            : narrow
              ? { background: '#e7f0e4', width: '100%', padding: '0 12px 72px', boxSizing: 'border-box' }
              : { paddingTop: 8, width: '100%' }
        }
      >
        <div className={`mh-list-page${dark ? ' mh-list-page--dark' : ''}${narrow ? ' mh-list-page--mobile' : ''}`}>
          <div className="mh-list-chrome">
            {narrow ? null : (
              <div className="mh-list-chrome-top">
                <div>
                  <h2 className="mh-list-chrome-title">Meeting history</h2>
                  <p className="mh-list-chrome-sub">Who joined each team meeting</p>
                </div>
              </div>
            )}
            <div className="mh-toolbar-card">
              <Button danger onClick={() => void clearMeetings()} style={{ marginBottom: 12 }}>
                Clear all meetings
              </Button>
              {narrow ? (
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFiltersOpen((open) => !open)}
                  style={{ marginBottom: filtersOpen ? 12 : 0 }}
                >
                  Filters {filtersOpen ? <UpOutlined /> : <DownOutlined />}
                </Button>
              ) : null}
              {!narrow || filtersOpen ? (
                <Form layout="vertical" className="mh-toolbar-form">
                  <Form.Item label="Date range">
                    <RangePicker
                      format="DD/MM/YYYY"
                      value={range as any}
                      onChange={(value) => setRange(value && value[0] && value[1] ? [value[0], value[1]] : null)}
                    />
                  </Form.Item>
                  <Form.Item label={narrow ? undefined : 'Keyword'}>
                    <Input
                      allowClear
                      placeholder="Name"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      onPressEnter={() => setAppliedKeyword(keyword)}
                    />
                  </Form.Item>
                  <Form.Item className="mh-toolbar-actions" label={narrow ? undefined : ' '}>
                    <Button
                      type="primary"
                      className="mh-btn-search"
                      icon={<SearchOutlined />}
                      onClick={() => setAppliedKeyword(keyword)}
                    >
                      Search
                    </Button>
                  </Form.Item>
                </Form>
              ) : null}
            </div>
          </div>
          <div className={`mh-list-table-panel${narrow ? ' mh-list-table-panel--mobile' : ''}`}>
            {narrow ? renderCards() : (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={filtered}
                columns={columns}
                bordered
                size="middle"
                scroll={{ x: true }}
                locale={{ emptyText }}
                pagination={{ pageSize: 10, showSizeChanger: true }}
              />
            )}
          </div>
        </div>
      </UsersDiv>
    </Layout>
  );
};

export default MeetingHistory;
