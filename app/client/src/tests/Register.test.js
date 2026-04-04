/* eslint-env jest */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;

// --- GLOBAL MOCKS (mora biti prije require Register) ---

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

// Mock GoogleLoginButton (mora biti prije require Register)
jest.mock('../components/GoogleLoginButton', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: function MockGoogleLoginButton() {
            return React.createElement('div', { 'data-testid': 'mock-google' }, 'GoogleMock');
        }
    };
});

// If Register imports images, ensure app/client/__mocks__/fileMock.js exists:
// module.exports = 'test-file-stub';

// --- Require real modules after mocks ---
const Register = require('../pages/RegisterEmail').default;
const { AuthContext } = require('../context/AuthContext');

// --- Helper to render Register with AuthContext ---
const renderRegister = (mockSetUser) => {
    return render(
        React.createElement(
            AuthContext.Provider,
            { value: { setUser: mockSetUser } },
            React.createElement(
                require('react-router-dom').MemoryRouter,
                null,
                React.createElement(Register, null)
            )
        )
    );
};

describe('RegisterEmail component', () => {
    let mockSetUser;

    beforeEach(() => {
        mockSetUser = jest.fn();
        jest.clearAllMocks();
    });

    test('Test 1: Uspjesna registracija emaila, prikazuje popup za potvrdu emaila i ne navigira', async () => {
        const email = 'novi.korisnik@test.com';
        const password = 'Password123';
        const successMessage = 'Poslan verifikacijski email.';

        api.post.mockResolvedValueOnce({ data: { message: successMessage } });

        renderRegister(mockSetUser);

        const user = userEvent.setup();

        const emailInput = screen.getByPlaceholderText(/Email Adresa|email/i);
        const passwordInput = screen.getByPlaceholderText(/^Lozinka$/i);
        const confirmInput = screen.getByPlaceholderText(/Potvrdi Lozinku|potvrdi/i);
        const termsCheckbox = screen.getByLabelText(/Prihvaćam uvjete korištenja/i);
        const submitBtn = screen.getByRole('button', { name: /Registracija|Slanje|registracija/i });

        // prije potvrde checkboxa gumb je onemogućen
        expect(submitBtn).toBeDisabled();

        await user.type(emailInput, email);
        await user.type(passwordInput, password);
        await user.type(confirmInput, password);

        // označimo checkbox
        await user.click(termsCheckbox);
        expect(termsCheckbox).toBeChecked();

        // sada gumb treba biti omogućen
        expect(submitBtn).not.toBeDisabled();

        await user.click(submitBtn);

        // čekamo poziv API i poruku u UI
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/register', {
                email,
                password,
                passwordCheck: password,
                termsAndConditions: true
            });
        });

        // UI prikazuje success poruku iz state.message
        const heading = await screen.findByText(/Provjerite email!/i);
        expect(heading).toBeInTheDocument();
        const msg = screen.getByText(new RegExp(successMessage, 'i'));
        expect(msg).toBeInTheDocument();

        // ne postavljamo user i ne navigiramo jer čekamo potvrdu emaila
        expect(mockSetUser).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('Test 2: Neuspjesna registracija zbog već postojeće adrese prikazuje error', async () => {
        const email = 'postoji@test.com';
        const password = 'Password123';
        const apiError = 'Korisnik već postoji';

        api.post.mockRejectedValueOnce({
            response: { status: 409, data: { message: apiError } }
        });

        renderRegister(mockSetUser);

        const user = userEvent.setup();

        const emailInput = screen.getByPlaceholderText(/Email Adresa|email/i);
        const passwordInput = screen.getByPlaceholderText(/^Lozinka$/i);
        const confirmInput = screen.getByPlaceholderText(/Potvrdi Lozinku|potvrdi/i);
        const termsCheckbox = screen.getByLabelText(/Prihvaćam uvjete korištenja/i);
        const submitBtn = screen.getByRole('button', { name: /Registracija|Slanje|registracija/i });

        await user.type(emailInput, email);
        await user.type(passwordInput, password);
        await user.type(confirmInput, password);
        await user.click(termsCheckbox);
        await user.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/register', {
                email,
                password,
                passwordCheck: password,
                termsAndConditions: true
            });

            expect(mockSetUser).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // error se prikazuje u <p className={styles.errorMessage}>
        const err = await screen.findByText(new RegExp(apiError, 'i'));
        expect(err).toBeInTheDocument();
    });

    test('Test 3: Neuspjesna registracija: lozinka ne zadovoljava minimalne zahtjeve', async () => {
        const email = 'novi@test.com';
        const weakPassword = 'weak'; // manje od 8 znakova, bez velikog slova, broja i posebnog znaka
        const apiError = 'Lozinka ne zadovoljava minimalne zahtjeve';

        // Simuliramo da backend vraća 400 s porukom o neispravnoj lozinki
        api.post.mockRejectedValueOnce({
            response: { status: 400, data: { message: apiError } }
        });

        renderRegister(mockSetUser);

        const user = userEvent.setup();

        const emailInput = screen.getByPlaceholderText(/Email Adresa|email/i);
        const passwordInput = screen.getByPlaceholderText(/^Lozinka$/i);
        const confirmInput = screen.getByPlaceholderText(/Potvrdi Lozinku|potvrdi/i);
        const termsCheckbox = screen.getByLabelText(/Prihvaćam uvjete korištenja/i);
        const submitBtn = screen.getByRole('button', { name: /Registracija|Slanje|registracija/i });

        await user.type(emailInput, email);
        await user.type(passwordInput, weakPassword);
        await user.type(confirmInput, weakPassword);
        await user.click(termsCheckbox);
        await user.click(submitBtn);

        // Očekujemo poziv API-ja s payloadom
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/register', {
                email,
                password: weakPassword,
                passwordCheck: weakPassword,
                termsAndConditions: true
            });

            // ne postavljamo user i ne navigiramo
            expect(mockSetUser).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // Provjera da se error poruka prikazuje u UI
        const err = await screen.findByText(new RegExp(apiError, 'i'));
        expect(err).toBeInTheDocument();
    });

});
