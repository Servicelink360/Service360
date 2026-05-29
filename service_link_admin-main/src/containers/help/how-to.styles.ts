import styled from 'styled-components';

export const HelpPageWrap = styled.div`
  max-width: 960px;
  line-height: 1.6;
  color: #1a1a1a;

  h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-size: 1.15rem;
    margin: 1.75rem 0 0.75rem;
    color: #397d36;
  }

  h3 {
    font-size: 1rem;
    margin: 1.25rem 0 0.5rem;
  }

  p {
    margin-bottom: 0.75rem;
  }

  ul,
  ol {
    margin: 0 0 1rem 1.25rem;
    padding: 0;
  }

  li {
    margin-bottom: 0.35rem;
  }

  .help-intro {
    color: #555;
    margin-bottom: 1.5rem;
  }

  .help-phase {
    background: #f6faf5;
    border: 1px solid #d4e8d2;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }

  .help-phase-title {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #2d5f2a;
  }

  .help-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75rem 0 1.25rem;
    font-size: 0.95rem;
  }

  .help-table th,
  .help-table td {
    border: 1px solid #e0e0e0;
    padding: 0.5rem 0.75rem;
    text-align: left;
    vertical-align: top;
  }

  .help-table th {
    background: #eef6ed;
    font-weight: 600;
  }

  .help-nav-link {
    color: #397d36;
    font-weight: 500;
    &:hover {
      text-decoration: underline;
    }
  }

  .help-warning {
    background: #fffbe6;
    border: 1px solid #ffe58f;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
  }

  .help-toc {
    background: #fafafa;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;

    a {
      display: block;
      margin: 0.25rem 0;
      color: #397d36;
    }
  }
`;
