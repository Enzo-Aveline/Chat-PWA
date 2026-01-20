import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';
import { describe, it, expect } from 'vitest';

describe('useToast Hook', () => {
  it('should initialize with an empty list of toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast when showToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test Message', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: 'Test Message',
      type: 'success',
    });
  });

  it('should remove a toast when removeToast is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test Message', 'info');
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should add specific toast types using helper methods', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showError('Error Msg');
      result.current.showSuccess('Success Msg');
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].type).toBe('error');
    expect(result.current.toasts[1].type).toBe('success');
  });
});
