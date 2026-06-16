import { breakPoint } from '@app/assets/styles/breakPoints';
import { Button, Form } from 'antd';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(12px, -18px) scale(1.04); }
`;

const floatAlt = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-16px, 14px) scale(0.96); }
`;

export const PasswordIcon = styled(FaLock)`
  color: #0f5c3f;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`;

export const EmailIcon = styled(FaEnvelope)`
  color: #0f5c3f;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`;

export const MainParent = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #f0fdf4 0%, #ffffff 45%, #f9fafb 100%);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  overflow-x: hidden;
`;

export const SignInBody = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 5% 64px;
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  &::before {
    width: 420px;
    height: 420px;
    top: 8%;
    left: -120px;
    background: radial-gradient(circle, rgba(134, 239, 172, 0.35) 0%, transparent 70%);
    animation: ${float} 10s ease-in-out infinite;
  }

  &::after {
    width: 360px;
    height: 360px;
    bottom: 5%;
    right: -80px;
    background: radial-gradient(circle, rgba(15, 92, 63, 0.12) 0%, transparent 70%);
    animation: ${floatAlt} 12s ease-in-out infinite;
  }
`;

export const SignInShell = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
`;

export const WrapperForm = styled(Form)`
  width: 100%;
`;

export const FormDiv = styled.div`
  background: #ffffff;
  border-radius: 28px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 50px rgba(15, 92, 63, 0.08);
  overflow: hidden;

  .form-header {
    padding: 28px 32px 0;
    text-align: center;

    .logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .logo-mark svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .logo-type {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
      text-align: left;
    }

    .logo-type strong {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #111827;
    }

    .logo-type span {
      font-size: 0.58rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #4b5563;
      font-weight: 600;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #111827;
      margin: 0 0 6px;
    }

    .subtitle {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 28px;
    }
  }

  .wrapperForm {
    padding: 0 32px;
  }

  .field {
    margin-bottom: 20px;

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .field-input {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 0 14px;
      background: #f9fafb;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus-within {
        border-color: #0f5c3f;
        box-shadow: 0 0 0 3px rgba(15, 92, 63, 0.1);
        background: #fff;
      }

      input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        padding: 12px 0;
        /* 16px prevents iOS Safari zoom-on-focus, which breaks the login layout */
        font-size: 16px;
        line-height: 1.25;
        color: #111827;
        /* System font: custom webfonts break password bullets on iOS (show as long lines) */
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        letter-spacing: normal;
        min-width: 0;
        -webkit-text-size-adjust: 100%;

        &::placeholder {
          color: #9ca3af;
          font-size: 16px;
        }

        &[type='password'] {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      }

      .password-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: none;
        background: transparent;
        padding: 4px;
        cursor: pointer;
        color: #9ca3af;
        font-size: 0.95rem;
        line-height: 1;

        &:hover {
          color: #0f5c3f;
        }
      }
    }
  }

  .save {
    margin-top: 8px;
  }

  .forgot {
    display: block;
    text-align: center;
    padding: 20px 32px 24px;
    border-top: 1px solid #f3f4f6;
    font-size: 0.88rem;
    color: #0f5c3f;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      color: #0a4230;
    }
  }

  .endOfForm {
    display: block;
    text-align: center;
    padding: 0 32px 24px;
    font-size: 0.75rem;
    color: #9ca3af;
    text-decoration: none;

    &:hover {
      color: #0f5c3f;
      text-decoration: underline;
    }
  }

  @media only screen and (max-width: ${breakPoint.LDPhone}px) {
    border-radius: 22px;

    .form-header,
    .wrapperForm {
      padding-left: 24px;
      padding-right: 24px;
    }

    .forgot {
      padding-left: 24px;
      padding-right: 24px;
    }
  }
`;

export const SubmitButton = styled(Button)`
  && {
    width: 100%;
    height: 48px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #0f5c3f 0%, #0a4230 100%);
    color: #fff;
    font-weight: 700;
    font-size: 0.95rem;
    font-family: inherit;
    box-shadow: 0 4px 14px rgba(15, 92, 63, 0.25);
    margin-bottom: 4px;

    &:hover,
    &:focus {
      background: linear-gradient(135deg, #0a4230 0%, #083828 100%);
      color: #fff;
    }
  }
`;
