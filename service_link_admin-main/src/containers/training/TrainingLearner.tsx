import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import {
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  FormOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Empty, Progress, Radio, Space, Spin, Tag, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import { formatTrainingBody } from './formatTrainingBody';
import './training.css';

type ModuleListItem = {
  id: number;
  code: string;
  title: string;
  description?: string;
  durationMins: number;
  topicCount: number;
  siteName?: string | null;
  assignment?: { dueAt?: string | null; overdue?: boolean; notes?: string | null } | null;
  progress: {
    status: string;
    completedTopics: number;
    topicTotal: number;
    quizAttempts: number;
    bestScore: number | null;
    bestTotal: number | null;
    percent: number;
    passedAt?: string | null;
    expiresAt?: string | null;
    certificateUrl?: string | null;
    certificateCode?: string | null;
  };
};

type Topic = {
  id: number;
  title: string;
  body: string;
  order: number;
  completed: boolean;
};

type QuizQuestion = {
  id: number;
  type: string;
  prompt: string;
  options: { key: string; text: string }[];
  order: number;
};

const statusLabel: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  topics_done: 'Ready for test',
  failed: 'Retake test',
  passed: 'Passed',
  expired: 'Expired - refresh',
};

/** Keep long extracted Word titles/prompts readable in the learner UI. */
function clipText(raw: string, max: number): string {
  const t = String(raw || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function ExpandableText({
  text,
  max = 140,
  className,
}: {
  text: string;
  max?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const full = String(text || '').trim();
  if (full.length <= max) {
    return <span className={className}>{full}</span>;
  }
  return (
    <span className={className}>
      {open ? full : clipText(full, max)}{' '}
      <button
        type="button"
        className="training-more"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {open ? 'Show less' : 'Show more'}
      </button>
    </span>
  );
}

type TrainingPageProps = {
  kind?: 'TRAINING' | 'INDUCTION';
};

const TrainingPage: React.FC<TrainingPageProps> = ({ kind = 'TRAINING' }) => {
  const isInduction = kind === 'INDUCTION';
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleListItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    passed: 0,
    inProgress: 0,
    overdue: 0,
    expired: 0,
  });
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [passPercent, setPassPercent] = useState(80);
  const [progressStatus, setProgressStatus] = useState('not_started');
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [mode, setMode] = useState<'learn' | 'quiz' | 'result'>('learn');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/modules`,
        'GET',
        { kind },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not load training modules');
        setModules([]);
        return;
      }
      setModules(res.data?.modules || []);
      setSummary(
        res.data?.summary || {
          total: 0,
          passed: 0,
          inProgress: 0,
          overdue: 0,
          expired: 0,
        },
      );
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const loadModule = useCallback(async (id: number, preferQuiz = false) => {
    setModuleLoading(true);
    setActiveModuleId(id);
    setResult(null);
    setAnswers({});
    try {
      await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/modules/${id}/start`,
        'POST',
        {},
      );
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/modules/${id}`,
        'GET',
        null,
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not open module');
        setActiveModuleId(null);
        return;
      }
      const data = res.data;
      setModuleTitle(data.module?.title || '');
      setModuleDesc(data.module?.description || '');
      const nextTopics: Topic[] = data.topics || [];
      setTopics(nextTopics);
      setQuizUnlocked(!!data.quiz?.unlocked);
      setQuizQuestions(data.quiz?.questions || []);
      setPassPercent(data.quiz?.passPercent || data.module?.passPercent || 80);
      setProgressStatus(data.progress?.status || 'not_started');
      setCertificateUrl(data.progress?.certificateUrl || null);
      setExpiresAt(data.progress?.expiresAt || null);

      const firstIncomplete = nextTopics.findIndex((t) => !t.completed);
      const idx = firstIncomplete >= 0 ? firstIncomplete : Math.max(0, nextTopics.length - 1);
      setTopicIndex(idx);

      if (preferQuiz && data.quiz?.unlocked) {
        setMode('quiz');
      } else if (data.progress?.status === 'passed' && data.quiz?.unlocked) {
        setMode('learn');
      } else if (data.quiz?.unlocked && firstIncomplete < 0) {
        setMode('quiz');
      } else {
        setMode('learn');
      }
    } finally {
      setModuleLoading(false);
    }
  }, []);

  const currentTopic = topics[topicIndex];

  const completeCurrentTopic = async () => {
    if (!activeModuleId || !currentTopic) return;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/modules/${activeModuleId}/topics/${currentTopic.id}/complete`,
      'POST',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save progress');
      return;
    }
    const unlocked = !!res.data?.quizUnlocked;
    setQuizUnlocked(unlocked);
    setTopics((prev) =>
      prev.map((t) => (t.id === currentTopic.id ? { ...t, completed: true } : t)),
    );
    setProgressStatus(res.data?.progress?.status || progressStatus);

    if (topicIndex < topics.length - 1) {
      setTopicIndex(topicIndex + 1);
      message.success('Topic completed');
    } else if (unlocked) {
      message.success('All topics done - you can take the test');
      setMode('quiz');
      // refresh questions
      const detail = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/modules/${activeModuleId}`,
        'GET',
        null,
      );
      if (detail?.code === 1) {
        setQuizQuestions(detail.data?.quiz?.questions || []);
        setQuizUnlocked(!!detail.data?.quiz?.unlocked);
      }
    }
  };

  const submitQuiz = async () => {
    if (!activeModuleId) return;
    const missing = quizQuestions.filter((q) => !answers[q.id]);
    if (missing.length) {
      message.warning(`Answer all questions (${missing.length} remaining)`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/modules/${activeModuleId}/quiz/submit`,
        'POST',
        {
          answers: quizQuestions.map((q) => ({
            questionId: q.id,
            answerKey: answers[q.id],
          })),
        },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Quiz submit failed');
        return;
      }
      setResult(res.data);
      setMode('result');
      setProgressStatus(res.data?.progress?.status || progressStatus);
      setCertificateUrl(res.data?.certificateUrl || res.data?.progress?.certificateUrl || null);
      setExpiresAt(res.data?.progress?.expiresAt || null);
      if (res.data?.passed) {
        message.success('Module passed');
      } else {
        message.warning('Score below pass mark - review topics and try again');
      }
      loadCatalog();
    } finally {
      setSubmitting(false);
    }
  };

  const catalogView = useMemo(
    () => (
      <>
        <div className="training-hero">
          <h1>{isInduction ? 'Site induction' : 'Staff training'}</h1>
          <p>
            {isInduction
              ? 'Complete inductions for your assigned job sites. Learn the topics first, then pass the assessment. Progress is saved automatically.'
              : 'Complete each module by learning the topics first, then pass the assessment. Your progress is saved automatically so you can continue anytime.'}
          </p>
          <div className="training-summary">
            <span className="training-pill">
              Modules <strong>{summary.total}</strong>
            </span>
            <span className="training-pill">
              In progress <strong>{summary.inProgress}</strong>
            </span>
            <span className="training-pill">
              Passed <strong>{summary.passed}</strong>
            </span>
            {(summary.overdue || 0) > 0 ? (
              <span className="training-pill">
                Overdue <strong>{summary.overdue}</strong>
              </span>
            ) : null}
            {(summary.expired || 0) > 0 ? (
              <span className="training-pill">
                Expired <strong>{summary.expired}</strong>
              </span>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : !modules.length ? (
          <Empty description="No training modules yet" />
        ) : (
          <div className="training-grid">
            {modules.map((m) => {
              const st = m.progress?.status || 'not_started';
              const pct =
                st === 'passed'
                  ? 100
                  : m.progress?.percent || 0;
              return (
                <div
                  key={m.id}
                  className="training-card"
                  onClick={() => loadModule(m.id, st === 'topics_done' || st === 'failed')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadModule(m.id);
                  }}
                >
                  <div className="training-card-top">
                    <span className="training-code">{m.code}</span>
                    <span className={`training-status ${st}`}>{statusLabel[st] || st}</span>
                  </div>
                  <h3>{m.title}</h3>
                  <p className="desc">
                    {m.siteName ? `${m.siteName} - ` : ''}
                    {clipText(m.description || 'Safety and workplace training module.', 120)}
                  </p>
                  <div className="training-card-meta">
                    <span>
                      {m.durationMins} min - {m.topicCount} topics
                      {m.assignment?.dueAt
                        ? ` - due ${String(m.assignment.dueAt).slice(0, 10)}`
                        : ''}
                      {m.progress?.expiresAt && m.progress.status === 'passed'
                        ? ` - expires ${String(m.progress.expiresAt).slice(0, 10)}`
                        : ''}
                      {m.progress?.bestScore != null
                        ? ` - best ${m.progress.bestScore}/${m.progress.bestTotal}`
                        : ''}
                    </span>
                    <div className="training-progress-bar" style={{ maxWidth: 90 }}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {m.progress?.certificateUrl ? (
                    <a
                      href={m.progress.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#147a54' }}
                    >
                      Download certificate
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </>
    ),
    [loading, modules, summary, loadModule, isInduction],
  );

  const topicsDone = topics.filter((t) => t.completed).length;

  const playerView = (
    <>
      <button
        type="button"
        className="training-back"
        onClick={() => {
          setActiveModuleId(null);
          loadCatalog();
        }}
      >
        <ArrowLeftOutlined /> Back to {isInduction ? 'inductions' : 'modules'}
      </button>

      {moduleLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <div className="training-player">
          <aside className="training-side">
            <h2 title={moduleTitle}>{clipText(moduleTitle, 80)}</h2>
            <p className="sub">
              {statusLabel[progressStatus] || progressStatus}
              {topics.length ? ` - Topics ${topicsDone}/${topics.length}` : ''}
              {expiresAt ? ` - Expires ${String(expiresAt).slice(0, 10)}` : ''}
            </p>
            {!quizUnlocked && progressStatus !== 'passed' ? (
              <p className="sub-hint">Finish all topics to unlock the test.</p>
            ) : quizUnlocked && progressStatus !== 'passed' ? (
              <p className="sub-hint">Test unlocked - take the assessment when ready.</p>
            ) : null}
            {certificateUrl ? (
              <a
                href={certificateUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', marginBottom: 10, fontSize: 13, fontWeight: 600 }}
              >
                Download certificate PDF
              </a>
            ) : null}
            <ul className="training-topic-list">
              {topics.map((t, i) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={mode === 'learn' && i === topicIndex ? 'active' : ''}
                    title={t.title}
                    onClick={() => {
                      setMode('learn');
                      setTopicIndex(i);
                    }}
                  >
                    <span className={`dot ${t.completed ? 'done' : ''}`} />
                    <span>{clipText(t.title, 64)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 12 }}>
              <Button
                block
                type={mode === 'quiz' || mode === 'result' ? 'primary' : 'default'}
                icon={<FormOutlined />}
                disabled={!quizUnlocked}
                onClick={() => {
                  setMode('quiz');
                  setResult(null);
                }}
              >
                {progressStatus === 'passed' ? 'Review test' : 'Take test'}
              </Button>
            </div>
          </aside>

          <section className="training-main">
            {mode === 'learn' && currentTopic && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="green">
                    Topic {topicIndex + 1} / {topics.length}
                  </Tag>
                  {currentTopic.completed ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      Completed
                    </Tag>
                  ) : null}
                </div>
                <h1 title={currentTopic.title}>{clipText(currentTopic.title, 100)}</h1>
                {moduleDesc ? (
                  <p className="lead">{clipText(moduleDesc, 160)}</p>
                ) : null}
                <div className="training-body">{formatTrainingBody(currentTopic.body)}</div>
                <div className="training-actions">
                  <Button
                    disabled={topicIndex <= 0}
                    onClick={() => setTopicIndex((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </Button>
                  {!currentTopic.completed ? (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={completeCurrentTopic}>
                      Mark complete &amp; continue
                    </Button>
                  ) : topicIndex < topics.length - 1 ? (
                    <Button type="primary" onClick={() => setTopicIndex((i) => i + 1)}>
                      Next topic
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      disabled={!quizUnlocked}
                      onClick={() => setMode('quiz')}
                    >
                      Go to test
                    </Button>
                  )}
                </div>
              </>
            )}

            {mode === 'quiz' && (
              <>
                {!quizUnlocked ? (
                  <div className="training-locked">
                    <BookOutlined style={{ fontSize: 28, marginBottom: 8 }} />
                    <div>Complete all learning topics before taking the test.</div>
                  </div>
                ) : (
                  <>
                    <h1>Assessment</h1>
                    <p className="lead">
                      Pass mark {passPercent}%. Answer every question, then submit.
                      {progressStatus === 'passed' ? ' You have already passed this module.' : ''}
                    </p>
                    {quizQuestions.map((q, idx) => (
                      <div className="training-quiz-q" key={q.id}>
                        <h4>
                          {idx + 1}.{' '}
                          <ExpandableText text={q.prompt} max={160} />
                        </h4>
                        <Radio.Group
                          value={answers[q.id]}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {(q.options || []).map((o) => (
                              <Radio key={o.key} value={o.key} className="training-quiz-option">
                                {q.type === 'TRUE_FALSE' ? (
                                  <ExpandableText text={o.text} max={120} />
                                ) : (
                                  <>
                                    ({o.key}) <ExpandableText text={o.text} max={120} />
                                  </>
                                )}
                              </Radio>
                            ))}
                          </Space>
                        </Radio.Group>
                      </div>
                    ))}
                    <div className="training-actions">
                      <Button onClick={() => setMode('learn')}>Back to topics</Button>
                      <Button type="primary" loading={submitting} onClick={submitQuiz}>
                        Submit test
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {mode === 'result' && result && (
              <>
                <h1>{result.passed ? 'Passed' : 'Not passed yet'}</h1>
                <p className="lead">
                  Score {result.score}/{result.total} ({result.percent}%). Pass mark{' '}
                  {result.passPercent}%.
                </p>
                <Progress
                  percent={result.percent}
                  status={result.passed ? 'success' : 'exception'}
                  style={{ maxWidth: 360, marginBottom: 16 }}
                />
                {result.passed && (result.certificateUrl || certificateUrl) ? (
                  <p>
                    <a
                      href={result.certificateUrl || certificateUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download your certificate PDF
                    </a>
                    {result.certificateCode || result.progress?.certificateCode
                      ? ` - ID ${result.certificateCode || result.progress?.certificateCode}`
                      : ''}
                  </p>
                ) : null}
                {(result.results || []).map((r: any, idx: number) => (
                  <div className="training-quiz-q" key={r.questionId}>
                    <h4>
                      {idx + 1}. <ExpandableText text={r.prompt} max={160} />
                    </h4>
                    <div className={r.correct ? 'training-result-ok' : 'training-result-bad'}>
                      Your answer: {String(r.answerKey || '-').toUpperCase()}
                      {r.correct
                        ? ' (correct)'
                        : ` (correct was ${String(r.correctKey || '').toUpperCase()})`}
                    </div>
                  </div>
                ))}
                <div className="training-actions">
                  <Button
                    onClick={() => {
                      setActiveModuleId(null);
                      loadCatalog();
                    }}
                  >
                    Back to modules
                  </Button>
                  {!result.passed ? (
                    <Button type="primary" onClick={() => setMode('quiz')}>
                      Retry test
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );

  return (
    <Layout title={isInduction ? 'Induction' : 'Training'}>
      <UsersDiv>
        <div className="training-page">{activeModuleId ? playerView : catalogView}</div>
      </UsersDiv>
    </Layout>
  );
};

export default TrainingPage;
