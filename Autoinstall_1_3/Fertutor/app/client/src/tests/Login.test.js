/* eslint-env jest */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;

// --- GLOBAL MOCKS (must be defined before requiring Login) ---

// Mock react-router-dom (useNavigate + MemoryRouter)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
    const React = require('react');
    return {
        __esModule: true,
        MemoryRouter: ({ children }) => React.createElement(React.Fragment, null, children),
        Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
        useNavigate: () => mockNavigate
    };
});

// Mock api module
jest.mock('../api', () => ({
    __esModule: true,
    default: { post: jest.fn() }
}));
const api = require('../api').default;

// --- MOCK GoogleLoginButton (mora biti prije require('../pages/Login')) ---
jest.mock('../components/GoogleLoginButton', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: function MockGoogleLoginButton() {
            return React.createElement('div', { 'data-testid': 'mock-google' }, 'GoogleMock');
        }
    };
});


// If Login imports images, ensure app/client/__mocks__/fileMock.js exists:
// module.exports = 'test-file-stub';

// --- Require real modules after mocks ---
const Login = require('../pages/Login').default;
const { AuthContext } = require('../context/AuthContext');

// --- Shared helpers and setup ---
const renderLogin = (mockSetUser) => {
    return render(
        React.createElement(
            AuthContext.Provider,
            { value: { setUser: mockSetUser } },
            React.createElement(
                require('react-router-dom').MemoryRouter,
                null,
                React.createElement(Login, null)
            )
        )
    );
};

describe('Login component', () => {
    let mockSetUser;

    beforeEach(() => {
        mockSetUser = jest.fn();
        jest.clearAllMocks();
    });

    test('Test 1 - Successful login: calls api.post, sets user and navigates to "/" (homepage)', async () => {
        const testEmail = 'user@test.com';
        const testPassword = 'Password123!';
        const fakeUser = { id: 42, name: 'Test User', email: testEmail };

        api.post.mockResolvedValueOnce({ data: { user: fakeUser } });

        renderLogin(mockSetUser);

        const emailInput = screen.getByPlaceholderText(/email/i);
        const passwordInput = screen.getByPlaceholderText(/lozinka|password/i);
        const submitBtn = screen.getByRole('button', { name: /prijava|login/i });

        const user = userEvent.setup();
        await user.type(emailInput, testEmail);
        await user.type(passwordInput, testPassword);
        await user.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/login', {
                email: testEmail,
                password: testPassword,
                rememberLogin: false
            });

            expect(mockSetUser).toHaveBeenCalledWith(fakeUser);
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    test('Test 2 - Failed login (wrong password): shows error and does not set user or navigate', async () => {
        const testEmail = 'user@test.com';
        const wrongPassword = 'WrongPassword';

        api.post.mockRejectedValueOnce({
            response: { status: 401, data: { message: 'Neispravna lozinka' } }
        });

        renderLogin(mockSetUser);

        const emailInput = screen.getByPlaceholderText(/email/i);
        const passwordInput = screen.getByPlaceholderText(/lozinka|password/i);
        const submitBtn = screen.getByRole('button', { name: /prijava|login/i });

        const user = userEvent.setup();
        await user.type(emailInput, testEmail);
        await user.type(passwordInput, wrongPassword);
        await user.click(submitBtn);

        await waitFor(() => {
            // API called with expected payload
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/login', {
                email: testEmail,
                password: wrongPassword,
                rememberLogin: false
            });

            // No user set and no navigation
            expect(mockSetUser).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // UI error assertion (tries role="alert" first, then text match)
        const alert = screen.queryByRole('alert');
        if (alert) {
            expect(alert).toHaveTextContent(/lozink|neispravn|pogreš/i);
        } else {
            const textMatch = screen.queryByText(/neispravna lozinka|pogrešna lozinka|invalid password|wrong password/i);
            expect(textMatch).toBeTruthy();
        }
    });

    test('Test 3 - Failed login (Non-existent email): shows "user not found" error and does not set user or navigate', async () => {
        const wrongEmail = 'noone@nowhere.com';
        const anyPassword = 'SomePassword';

        // Simuliramo API rejection s 404 i porukom da korisnik ne postoji
        api.post.mockRejectedValueOnce({
            response: { status: 400, data: { message: 'Korisnik ne postoji' } }
        });

        renderLogin(mockSetUser);

        const emailInput = screen.getByPlaceholderText(/email/i);
        const passwordInput = screen.getByPlaceholderText(/lozinka|password/i);
        const submitBtn = screen.getByRole('button', { name: /prijava|login/i });

        const user = userEvent.setup();
        await user.type(emailInput, wrongEmail);
        await user.type(passwordInput, anyPassword);
        await user.click(submitBtn);

        // Pričekamo da API bude pozvan i da se stanje ažurira
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/login', {
                email: wrongEmail,
                password: anyPassword,
                rememberLogin: false
            });

            expect(mockSetUser).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // Provjera UI poruke: prvo pokušamo role="alert", inače tražimo tekstualnu poruku
        const alert = screen.queryByRole('alert');
        if (alert) {
            expect(alert).toHaveTextContent(/korisnik ne postoji|ne postoji korisnik|user not found/i);
        } else {
            const textMatch = await screen.findByText(/korisnik ne postoji|ne postoji korisnik|user not found/i);
            expect(textMatch).toBeTruthy();
        }
    });

});
