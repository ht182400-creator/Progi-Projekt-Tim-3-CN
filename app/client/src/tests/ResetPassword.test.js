/* eslint-env jest */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');
const userEvent = require('@testing-library/user-event').default;

// --- 全局 Mock ---

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

// Mock api 模块
jest.mock('../api', () => ({
    __esModule: true,
    default: { post: jest.fn() }
}));
const api = require('../api').default;

// --- 引入真实 ResetPassword 组件 ---
const ResetPassword = require('../pages/ResetPassword').default;

// --- 辅助函数：渲染 ResetPassword ---
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
        mockSearchParams.delete('token'); // 每次测试前重置 token 参数
    });

    test('测试1：密码重置成功（边界条件）', async () => {
        const token = 'valid-token';
        const password = 'Abcdef1!'; // 8位，含大写字母、数字、特殊字符
        const successMessage = '密码修改成功。';

        // 模拟 URL 包含 token
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

    test('测试2：点击"支持"按钮抛出错误（方法不存在）', async () => {
        renderResetPassword();

        const supportBtn = screen.getByRole('button', { name: /Podrška/i });
        const user = userEvent.setup();

        // 预期点击时抛出 ReferenceError
        await expect(user.click(supportBtn)).rejects.toThrow(ReferenceError);
    });

});
