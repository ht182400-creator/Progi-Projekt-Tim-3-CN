/* eslint-env jest */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;

// --- GLOBAL MOCKS ---

// Mock react-router-dom (useNavigate + useSearchParams + MemoryRouter)
const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => {
    const React = require('react');
    return {
        __esModule: true,
        MemoryRouter: ({ children }) => React.createElement(React.Fragment, null, children),
        Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams]
    };
});

// Mock api module
jest.mock('../api', () => ({
    __esModule: true,
    default: { post: jest.fn() }
}));
const api = require('../api').default;

// --- Require real ResetPassword component ---
const ResetPassword = require('../pages/ResetPassword').default;

// --- Helper to render ResetPassword ---
const renderResetPassword = () => {
    return render(
        React.createElement(
            require('react-router-dom').MemoryRouter,
            null,
            React.createElement(ResetPassword, null)
        )
    );
};

describe('ResetPassword component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchParams.delete('token'); // reset parametar prije svakog testa
    });

    test('Test 1: uspješna promjena lozinke s rubnim uvjetima', async () => {
        const token = 'valid-token';
        const password = 'Abcdef1!'; // 8 znakova, veliko slovo, broj, specijalni znak
        const successMessage = 'Lozinka uspješno promijenjena.';

        // Simuliramo da URL sadrži token
        mockSearchParams.set('token', token);

        api.post.mockResolvedValueOnce({ data: { message: successMessage } });

        renderResetPassword();

        const user = userEvent.setup();

        const passwordInput = screen.getByPlaceholderText(/Nova lozinka/i);
        const confirmInput = screen.getByPlaceholderText(/Potvrdite lozinku/i);
        const submitBtn = screen.getByRole('button', { name: /Postavi lozinku/i });

        await user.type(passwordInput, password);
        await user.type(confirmInput, password);
        await user.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
                token,
                password,
                passwordCheck: password
            });
        });

        const success = await screen.findByText(/Uspjeh!/i);
        expect(success).toBeInTheDocument();

        const msg = screen.getByText(new RegExp(successMessage, 'i'));
        expect(msg).toBeInTheDocument();
    });

    test('Test 2: Klik na gumb "Podrška" baca grešku jer metoda ne postoji', async () => {
        renderResetPassword();

        const supportBtn = screen.getByRole('button', { name: /Podrška/i });
        const user = userEvent.setup();

        // Ovdje očekujemo da se dogodi greška
        await expect(user.click(supportBtn)).rejects.toThrow(ReferenceError);
    });

});