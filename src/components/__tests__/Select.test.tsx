// @vitest-environment jsdom
import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Select } from '../Select';

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

vi.mock('../Select.module.css', () => ({
  default: {
    field: 'field',
    isOpen: 'isOpen',
    isNative: 'isNative',
    native: 'native',
    nativeVisible: 'nativeVisible',
    trigger: 'trigger',
    value: 'value',
    isPlaceholder: 'isPlaceholder',
    chevron: 'chevron',
    dropdown: 'dropdown',
    dropdownPortal: 'dropdownPortal',
    option: 'option',
    optionHighlighted: 'optionHighlighted',
    optionSelected: 'optionSelected',
    chips: 'chips',
    chip: 'chip',
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

describe('Select', () => {
  const defaultOptions = ['Option A', 'Option B', 'Option C'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hidden native select for form submission', () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    const nativeSelect = document.querySelector('select[name="test"]');
    expect(nativeSelect).toBeInTheDocument();
    expect(nativeSelect).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders trigger button with correct ARIA attributes', () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens dropdown when trigger is clicked', async () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  it('shows options in listbox when dropdown is open', async () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });
  });

  it('calls onChange when option is selected', async () => {
    const onChange = vi.fn();
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        onChange={onChange}
        preferNative={false}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    fireEvent.mouseDown(options[1]);

    expect(onChange).toHaveBeenCalledWith('Option B');
  });

  it('closes on Escape key', async () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    fireEvent.keyDown(trigger, { key: 'Escape' });

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('marks required on native select when required prop is true', () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        required
        preferNative={false}
      />
    );

    const nativeSelect = document.querySelector('select[name="test"]');
    expect(nativeSelect).toHaveAttribute('required');
  });

  it('passes aria-describedby to trigger', () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        ariaDescribedBy="helper-text"
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-describedby', 'helper-text');
  });

  it('opens dropdown on Space key', async () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: ' ' });

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('opens dropdown on ArrowDown key', async () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('selects with Enter key', async () => {
    const onChange = vi.fn();
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        onChange={onChange}
        preferNative={false}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Option A');
  });

  it('supports multi-select mode', async () => {
    const onChange = vi.fn();
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        multi
        onChange={onChange}
        preferNative={false}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    fireEvent.mouseDown(options[0]);

    expect(onChange).toHaveBeenCalledWith(['Option A']);
  });

  it('sets aria-multiselectable in multi-select mode', async () => {
    render(
      <Select
        id="test-select"
        name="test"
        options={defaultOptions}
        multi
        preferNative={false}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    });
  });
});
