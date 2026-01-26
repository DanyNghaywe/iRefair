// @vitest-environment jsdom
import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ToastProvider, useToast } from '../Toast';

// Mock the LanguageProvider to avoid Next.js router dependency
vi.mock('../LanguageProvider', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../Toast.module.css', () => ({
  default: {
    container: 'container',
    toast: 'toast',
    exiting: 'exiting',
    icon: 'icon',
    iconSuccess: 'iconSuccess',
    iconError: 'iconError',
    iconWarning: 'iconWarning',
    iconInfo: 'iconInfo',
    content: 'content',
    title: 'title',
    message: 'message',
    closeBtn: 'closeBtn',
    progress: 'progress',
    progressSuccess: 'progressSuccess',
    progressError: 'progressError',
    progressWarning: 'progressWarning',
    progressInfo: 'progressInfo',
  },
}));

// Mock createPortal to render in place for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Test component that triggers toasts
function ToastTrigger() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success!', 'Operation completed')}>
        Show Success
      </button>
      <button onClick={() => toast.error('Error!', 'Something went wrong')}>
        Show Error
      </button>
      <button onClick={() => toast.warning('Warning!', 'Be careful')}>
        Show Warning
      </button>
      <button onClick={() => toast.info('Info', 'Just letting you know')}>
        Show Info
      </button>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('ToastProvider', () => {
  it('renders children', () => {
    renderWithProviders(<div>Child content</div>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders toast container with aria-label', () => {
    renderWithProviders(<div>Content</div>);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('throws error when used outside ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ToastTrigger />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleError.mockRestore();
  });

  it('shows success toast with title and message', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('shows error toast', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows warning toast', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByText('Warning!')).toBeInTheDocument();
    expect(screen.getByText('Be careful')).toBeInTheDocument();
  });

  it('shows info toast', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Just letting you know')).toBeInTheDocument();
  });

  it('shows multiple toasts', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('toast has role="alert" for accessibility', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Success'));

    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
  });

  it('toast has aria-live="polite"', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Success'));

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('renders close button with accessible label', () => {
    renderWithProviders(<ToastTrigger />);

    fireEvent.click(screen.getByText('Show Success'));

    const closeButton = screen.getByLabelText('Dismiss notification');
    expect(closeButton).toBeInTheDocument();
  });
});
