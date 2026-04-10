/* eslint-env jest */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;

// --- 全局 Mock（必须在 require Login 之前定义）---

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

// Mock api 模块
jest.mock('../api', () => ({
    __esModule: true,
    default: { post: jest.fn() }
}));
const api = require('../api').default;

// Mock GoogleLoginButton（必须在 require Login 之前）
jest.mock('../components/GoogleLoginButton', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: function MockGoogleLoginButton() {
            return React.createElement('div', { 'data-testid': 'mock-google' }, 'GoogleMock');
        }
    };
});

// --- 在 Mock 之后引入真实模块 ---
const Login = require('../pages/Login').default;
const { AuthContext } = require('../context/AuthContext');

// --- 共享辅助函数 ---
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

    test('测试1 - 登录成功：调用 api.post，设置用户并跳转到 "/"（首页）', async () => {
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

    test('测试2 - 登录失败（密码错误）：显示错误，不设置用户也不跳转', async () => {
        const testEmail = 'user@test.com';
        const wrongPassword = 'WrongPassword';

        api.post.mockRejectedValueOnce({
            response: { status: 401, data: { message: '密码错误' } }
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
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/login', {
                email: testEmail,
                password: wrongPassword,
                rememberLogin: false
            });

            expect(mockSetUser).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // UI 错误断言（先尝试 role="alert"，再尝试文本匹配）
        const alert = screen.queryByRole('alert');
        if (alert) {
            expect(alert).toHaveTextContent(/密码|错误|invalid|wrong/i);
        } else {
            const textMatch = screen.queryByText(/密码错误|invalid password|wrong password/i);
            expect(textMatch).toBeTruthy();
        }
    });

    test('测试3 - 登录失败（邮箱不存在）：显示"用户不存在"错误，不设置用户也不跳转', async () => {
        const wrongEmail = 'noone@nowhere.com';
        const anyPassword = 'SomePassword';

        // 模拟 API 返回 400，用户不存在
        api.post.mockRejectedValueOnce({
            response: { status: 400, data: { message: '用户不存在' } }
        });

        renderLogin(mockSetUser);

        const emailInput = screen.getByPlaceholderText(/email/i);
        const passwordInput = screen.getByPlaceholderText(/lozinka|password/i);
        const submitBtn = screen.getByRole('button', { name: /prijava|login/i });

        const user = userEvent.setup();
        await user.type(emailInput, wrongEmail);
        await user.type(passwordInput, anyPassword);
        await user.click(submitBtn);

        // 等待 API 调用完成并更新状态
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

        // 检查 UI 错误消息
        const alert = screen.queryByRole('alert');
        if (alert) {
            expect(alert).toHaveTextContent(/用户不存在|user not found/i);
        } else {
            const textMatch = await screen.findByText(/用户不存在|user not found/i);
            expect(textMatch).toBeTruthy();
        }
    });

});
