/* eslint-env jest */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;

// --- 全局 Mock（必须在 require Register 之前定义）---

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

// Mock GoogleLoginButton（必须在 require Register 之前）
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
const Register = require('../pages/RegisterEmail').default;
const { AuthContext } = require('../context/AuthContext');

// --- 辅助函数：渲染 Register 组件 ---
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

    test('测试1：邮箱注册成功，显示邮箱确认弹窗，不跳转', async () => {
        const email = 'novi.korisnik@test.com';
        const password = 'Password123';
        const successMessage = '验证邮件已发送。';

        api.post.mockResolvedValueOnce({ data: { message: successMessage } });

        renderRegister(mockSetUser);

        const user = userEvent.setup();

        const emailInput = screen.getByPlaceholderText(/Email Adresa|email/i);
        const passwordInput = screen.getByPlaceholderText(/^Lozinka$/i);
        const confirmInput = screen.getByPlaceholderText(/确认密码|potvrdi/i);
        const termsCheckbox = screen.getByLabelText(/接受使用条款/i);
        const submitBtn = screen.getByRole('button', { name: /Registracija|Slanje|registracija/i });

        // 勾选复选框前按钮应禁用
        expect(submitBtn).toBeDisabled();

        await user.type(emailInput, email);
        await user.type(passwordInput, password);
        await user.type(confirmInput, password);

        // 勾选复选框
        await user.click(termsCheckbox);
        expect(termsCheckbox).toBeChecked();

        // 勾选后按钮应启用
        expect(submitBtn).not.toBeDisabled();

        await user.click(submitBtn);

        // 等待 API 调用和 UI 更新
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/register', {
                email,
                password,
                passwordCheck: password,
                termsAndConditions: true
            });
        });

        // UI 显示成功消息
        const heading = await screen.findByText(/Provjerite email!/i);
        expect(heading).toBeInTheDocument();
        const msg = screen.getByText(new RegExp(successMessage, 'i'));
        expect(msg).toBeInTheDocument();

        // 等待邮箱确认，不设置用户也不跳转
        expect(mockSetUser).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('测试2：注册失败（邮箱已存在），显示错误信息', async () => {
        const email = 'postoji@test.com';
        const password = 'Password123';
        const apiError = '用户已存在';

        api.post.mockRejectedValueOnce({
            response: { status: 409, data: { message: apiError } }
        });

        renderRegister(mockSetUser);

        const user = userEvent.setup();

        const emailInput = screen.getByPlaceholderText(/Email Adresa|email/i);
        const passwordInput = screen.getByPlaceholderText(/^Lozinka$/i);
        const confirmInput = screen.getByPlaceholderText(/确认密码|potvrdi/i);
        const termsCheckbox = screen.getByLabelText(/接受使用条款/i);
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

        // 错误消息显示在 UI 中
        const err = await screen.findByText(new RegExp(apiError, 'i'));
        expect(err).toBeInTheDocument();
    });

    test('测试3：注册失败（密码不符合最低要求）', async () => {
        const email = 'novi@test.com';
        const weakPassword = 'weak'; // 少于8位，无大写字母、数字和特殊字符
        const apiError = '密码不符合最低要求';

        // 模拟后端返回 400，密码不合规
        api.post.mockRejectedValueOnce({
            response: { status: 400, data: { message: apiError } }
        });

        renderRegister(mockSetUser);

        const user = userEvent.setup();

        const emailInput = screen.getByPlaceholderText(/Email Adresa|email/i);
        const passwordInput = screen.getByPlaceholderText(/^Lozinka$/i);
        const confirmInput = screen.getByPlaceholderText(/确认密码|potvrdi/i);
        const termsCheckbox = screen.getByLabelText(/接受使用条款/i);
        const submitBtn = screen.getByRole('button', { name: /Registracija|Slanje|registracija/i });

        await user.type(emailInput, email);
        await user.type(passwordInput, weakPassword);
        await user.type(confirmInput, weakPassword);
        await user.click(termsCheckbox);
        await user.click(submitBtn);

        // 等待 API 调用
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith('/auth/register', {
                email,
                password: weakPassword,
                passwordCheck: weakPassword,
                termsAndConditions: true
            });

            expect(mockSetUser).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        // 检查 UI 中显示的错误消息
        const err = await screen.findByText(new RegExp(apiError, 'i'));
        expect(err).toBeInTheDocument();
    });

});
