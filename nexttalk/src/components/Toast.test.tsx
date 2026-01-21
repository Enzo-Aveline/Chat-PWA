
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
    it('renders message correctly', () => {
        render(<Toast message="Test Message" onClose={() => { }} />);
        expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('renders with correct type style', () => {
        // We can check for specific icons based on type
        const { rerender } = render(<Toast message="Success" type="success" onClose={() => { }} />);
        expect(screen.getByText('✅')).toBeInTheDocument();

        rerender(<Toast message="Error" type="error" onClose={() => { }} />);
        expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('calls onClose after duration', () => {
        vi.useFakeTimers();
        const onClose = vi.fn();
        render(<Toast message="Test" duration={1000} onClose={onClose} />);

        expect(onClose).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(onClose).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
