import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Spin, Typography, Image, Tag, Button, message } from 'antd';
import moment from 'moment';
import { dateTimeFormat } from '@app/config/data.config';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import DelegationOutcomeBadge, { delegationOutcomeOf } from '../../components/report-faults/delegation-outcome';

const { Title, Text, Paragraph } = Typography;

function useQueryToken() {
  const { search } = useLocation();
  return new URLSearchParams(search).get('token') ?? '';
}

const PersonnelFaultViewPage: React.FC = () => {
  const token = useQueryToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setError('Invalid or missing link.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.PERSONNEL_FAULT_ACCESS}/view`,
        'GET',
        { token },
      );
      if (res?.code === 1 && res?.data) {
        setData(res.data);
        setError('');
      } else {
        setError(res?.message || 'Link expired or invalid.');
      }
    } catch {
      setError('Unable to load this fault.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onMarkActed = async () => {
    setMarking(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.PERSONNEL_FAULT_ACCESS}/mark-acted`,
        'PATCH',
        { token },
      );
      if (res?.code === 1) {
        message.success('Thank you — your customer has been notified this was acted on.');
        setData((prev: any) =>
          prev
            ? {
                ...prev,
                delegatedActedAt: res.data?.delegatedActedAt ?? prev.delegatedActedAt,
                delegationOutcome: res.data?.delegationOutcome ?? prev.delegationOutcome,
                canMarkActed: false,
              }
            : prev,
        );
      } else {
        message.error(res?.message || 'Could not confirm action');
      }
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '48px auto', padding: 24, textAlign: 'center' }}>
        <Title level={4}>Fault link unavailable</Title>
        <Text type="secondary">{error}</Text>
      </div>
    );
  }

  const media = Array.isArray(data.attachFiles) ? data.attachFiles : [];
  const urgent = +data.priority === 1;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Tag color={urgent ? 'red' : 'blue'}>{urgent ? 'Urgent fault' : 'Fault report'}</Tag>
        <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
          Service360 fault assignment
        </Title>
        <Text type="secondary">
          Hello {data.personnelName || 'there'} — please review and act by the deadline below.
        </Text>
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 20,
        }}
      >
        <p>
          <Text strong>Site:</Text> {data.siteName || '—'}
        </p>
        <p>
          <Text strong>Service:</Text> {data.serviceName || '—'}
        </p>
        <p>
          <Text strong>Customer:</Text> {data.companyName || '—'}
        </p>
        <p>
          <Text strong>Issue:</Text> {data.issue || '—'}
        </p>
        {data.toiletArea ? (
          <p>
            <Text strong>Toilet:</Text> {data.toiletArea}
          </p>
        ) : null}
        {data.delegatedUntil ? (
          <p>
            <Text strong>Act by:</Text>{' '}
            {moment(data.delegatedUntil).format(dateTimeFormat)}
          </p>
        ) : null}
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text strong>Status:</Text>
          <DelegationOutcomeBadge outcome={delegationOutcomeOf(data)} />
        </p>
        {data.delegatedActedAt ? (
          <p style={{ fontSize: 13, color: '#595959' }}>
            Confirmed acted {moment(data.delegatedActedAt).format(dateTimeFormat)}
          </p>
        ) : null}
        {data.delegationNote ? (
          <p>
            <Text strong>Note:</Text> {data.delegationNote}
          </p>
        ) : null}
        <Paragraph>
          <Text strong>Message:</Text>
          <br />
          {data.message?.trim() ? data.message : '—'}
        </Paragraph>
        {media.length > 0 ? (
          <>
            <Text strong>Photos / files</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Image.PreviewGroup>
                {media.map((url: string) => (
                  <Image
                    key={url}
                    src={url}
                    width={96}
                    height={96}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </Image.PreviewGroup>
            </div>
          </>
        ) : null}
        <p style={{ marginTop: 16, fontSize: 12, color: '#8c8c8c' }}>
          Reported {data.createdAt ? moment(data.createdAt).format(dateTimeFormat) : '—'}
        </p>
        {data.canMarkActed ? (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Button type="primary" size="large" loading={marking} onClick={onMarkActed}>
              Confirm I&apos;ve acted on this
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PersonnelFaultViewPage;
