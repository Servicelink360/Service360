import config from 'src/config';

const trimTrailingSlash = (url: string) => url.replace(/\/$/, '');

export const appBaseUrl = (): string =>
  trimTrailingSlash(config.APP_URL || 'https://service360.com.au');

export const supportEmail = (): string =>
  config.SUPPORT_EMAIL || 'support@service360.com.au';

export const emailSignInUrl = (): string => `${appBaseUrl()}/signin`;

export const emailTaskTodayUrl = (status = 'p'): string =>
  `${appBaseUrl()}/task-today?status=${encodeURIComponent(status)}`;

export const emailUserTaskTodayUrl = (): string =>
  `${appBaseUrl()}/user-task-today`;

export const emailMyTasksUrl = (): string => `${appBaseUrl()}/my-tasks`;

export const emailLinkHtml = (href: string, label?: string): string => {
  const text = label || href;
  return `<a target="_blank" href="${href}">${text}</a>`;
};

export const emailSupportFooterHtml = (): string =>
  `<p>If you have any questions, please contact us at: <a href="mailto:${supportEmail()}">${supportEmail()}</a></p>
<p>Service360 Support Team</p>`;

export const emailTaskAssignedHtml = (opts: {
  fullName: string;
  taskName: string;
  description?: string;
  siteName?: string;
  serviceName?: string;
  customerName?: string;
  startAt?: string;
  endAt?: string;
  linkPath?: 'task-today' | 'user-task-today';
  taskTodayStatus?: string;
}): string => {
  const link =
    opts.linkPath === 'task-today'
      ? emailTaskTodayUrl(opts.taskTodayStatus ?? 'p')
      : emailUserTaskTodayUrl();
  const lines = [
    `<p>Hello ${opts.fullName},</p>`,
    `<p>New task has been assigned to you</p>`,
    opts.taskName ? `<p>Task: ${opts.taskName}</p>` : '',
    opts.description ? `<p>Task description: ${opts.description}</p>` : '',
    opts.siteName ? `<p>Site: ${opts.siteName}</p>` : '',
    opts.serviceName ? `<p>Service: ${opts.serviceName}</p>` : '',
    opts.customerName ? `<p>Customer: ${opts.customerName}</p>` : '',
    opts.startAt ? `<p>Start at: ${opts.startAt}</p>` : '',
    opts.endAt ? `<p>End at: ${opts.endAt}</p>` : '',
    `<p>Access the link: ${emailLinkHtml(link)}</p>`,
    emailSupportFooterHtml(),
  ];
  return lines.filter(Boolean).join('\n');
};
