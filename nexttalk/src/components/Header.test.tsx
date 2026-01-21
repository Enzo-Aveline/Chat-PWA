
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from './Header';
import * as idb from '@/lib/idb';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

vi.mock('next/image', () => ({
    default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock('@/lib/idb', () => ({
    getProfile: vi.fn(),
    saveProfile: vi.fn(),
}));

describe('Header', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', async () => {
        (idb.getProfile as any).mockResolvedValue(null);
        render(<Header />);
        expect(screen.getByText('NextTalk')).toBeInTheDocument();
    });

    it('displays login button when no profile', async () => {
        (idb.getProfile as any).mockResolvedValue(null);
        render(<Header />);

        // Check for "Connexion" text
        await waitFor(() => {
            expect(screen.getByText('Connexion')).toBeInTheDocument();
        });
        expect(screen.queryByText('Déconnexion')).not.toBeInTheDocument();
    });

    it('displays profile info and logout when profile exists', async () => {
        const mockProfile = { username: 'TestUser', photo: 'test.jpg' };
        (idb.getProfile as any).mockResolvedValue(mockProfile);

        render(<Header />);

        await waitFor(() => {
            expect(screen.getByText('TestUser')).toBeInTheDocument();
        });
        expect(screen.getByText('Déconnexion')).toBeInTheDocument();
    });
});
