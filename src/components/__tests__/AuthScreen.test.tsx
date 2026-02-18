import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../ui/Toast';
import AuthScreen from '../auth/AuthScreen';

function renderAuthScreen(overrides: Partial<Parameters<typeof AuthScreen>[0]> = {}) {
  const props = {
    onDemo: vi.fn(),
    onMagicLink: vi.fn().mockResolvedValue({ error: null }),
    onGoogle: vi.fn().mockResolvedValue({ error: null }),
    onGitHub: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  const result = render(
    <ToastProvider>
      <AuthScreen {...props} />
    </ToastProvider>,
  );
  return { ...result, props };
}

describe('AuthScreen', () => {
  it('renders feature cards', () => {
    renderAuthScreen();
    expect(screen.getByText('Capture')).toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
    expect(screen.getByText('Reflect')).toBeInTheDocument();
  });

  it('calls onDemo when Try Demo is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderAuthScreen();
    await user.click(screen.getByText('Try Demo'));
    expect(props.onDemo).toHaveBeenCalledOnce();
  });

  it('sends magic link on form submit', async () => {
    const user = userEvent.setup();
    const { props } = renderAuthScreen();
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByText('Send Magic Link'));
    expect(props.onMagicLink).toHaveBeenCalledWith('test@example.com');
  });

  it('shows check-your-email after successful magic link', async () => {
    const user = userEvent.setup();
    renderAuthScreen();
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByText('Send Magic Link'));
    await waitFor(() => {
      expect(screen.getByText('Check your email!')).toBeInTheDocument();
    });
  });

  it('shows error toast on magic link failure', async () => {
    const user = userEvent.setup();
    renderAuthScreen({
      onMagicLink: vi.fn().mockResolvedValue({ error: new Error('Rate limited') }),
    });
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByText('Send Magic Link'));
    await waitFor(() => {
      expect(screen.getByText('Rate limited')).toBeInTheDocument();
    });
  });

  it('calls onGoogle when Google button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderAuthScreen();
    await user.click(screen.getByText('Continue with Google'));
    expect(props.onGoogle).toHaveBeenCalledOnce();
  });

  it('calls onGitHub when GitHub button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderAuthScreen();
    await user.click(screen.getByText('Continue with GitHub'));
    expect(props.onGitHub).toHaveBeenCalledOnce();
  });

  it('resets to email form when "Use a different email" is clicked', async () => {
    const user = userEvent.setup();
    renderAuthScreen();
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByText('Send Magic Link'));
    await waitFor(() => {
      expect(screen.getByText('Check your email!')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Use a different email'));
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('Check your email!')).not.toBeInTheDocument();
  });
});
