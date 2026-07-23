# Module 5: Testing React

Viết test cho những tính năng đã xây. Không build tính năng mới.
Học cách test React theo cách "user thật sự dùng" — không test implementation details.

---

## Triết lý của React Testing Library

> "Test theo cách user dùng, không phải cách bạn implement."

```
SAI (test implementation):
  expect(component.state.isOpen).toBe(true);   ← test internal state
  expect(wrapper.find('Button').prop('onClick')).toBeDefined();

ĐÚNG (test behavior):
  userEvent.click(screen.getByRole('button', { name: /mở menu/i }));
  expect(screen.getByText('Menu đang mở')).toBeInTheDocument();
```

**Lý do:** Nếu bạn đổi tên state từ `isOpen` sang `menuVisible`, test implementation sẽ fail dù tính năng vẫn đúng. Test behavior chỉ fail khi tính năng thật sự sai.

---

## Cài đặt

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Thêm vào `vite.config.js`:
```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.js',
}
```

Tạo `src/test/setup.js`:
```js
import '@testing-library/jest-dom';
```

---

## Bước 1 — Test component đơn giản

**Học được:** `render`, `screen`, `expect` — bộ 3 cơ bản.

**File test:** `src/components/ui/Button.test.jsx`

```jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Button from './Button';

describe('Button', () => {
  test('render đúng text', () => {
    render(<BrowserRouter><Button>Click me</Button></BrowserRouter>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('disabled khi prop disabled=true', () => {
    render(<BrowserRouter><Button disabled>Click</Button></BrowserRouter>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Query ưu tiên (theo RTL docs):**
```
getByRole        ← ưu tiên nhất (semantic, giống screen reader)
getByLabelText   ← form inputs
getByPlaceholderText
getByText
getByTestId      ← dùng cuối cùng khi không có cách nào khác
```

**Chạy test:**
```bash
npm run test
```

---

## Bước 2 — Test user interaction (click, type)

**Học được:** `userEvent` — simulate hành động user thật (phân biệt với `fireEvent` cấp thấp hơn).

**File test:** `src/components/ui/Chip.test.jsx`

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chip from './Chip';

test('gọi onClick khi nhấn', async () => {
  const handleClick = vi.fn();  // mock function
  render(<Chip onClick={handleClick}>Kỹ năng</Chip>);

  await userEvent.click(screen.getByText('Kỹ năng'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test('hiện active style khi active=true', () => {
  render(<Chip active>Kỹ năng</Chip>);
  // Kiểm tra class hoặc visual indicator
  expect(screen.getByText('Kỹ năng').closest('button'))
    .toHaveClass('bg-fwm-accent');  // hoặc whatever class active dùng
});
```

---

## Bước 3 — Test form và async

**Học được:** Test form submit + async (await + waitFor).

**File test:** `src/pages/Login.test.jsx`

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock API
vi.mock('../api/auth', () => ({
  login: vi.fn(),
}));
import { login } from '../api/auth';

// Helper: wrap với providers cần thiết
function renderLogin() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
}

test('đăng nhập thành công', async () => {
  login.mockResolvedValue({ token: 'abc', user: { name: 'Test', email: 'test@test.com' } });

  renderLogin();

  await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com');
  await userEvent.type(screen.getByLabelText(/mật khẩu/i), '123456');
  await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

  await waitFor(() => {
    expect(login).toHaveBeenCalledWith('test@test.com', '123456');
  });
});

test('hiện lỗi khi sai mật khẩu', async () => {
  login.mockRejectedValue(new Error('Invalid credentials'));

  renderLogin();
  await userEvent.type(screen.getByLabelText(/email/i), 'wrong@test.com');
  await userEvent.type(screen.getByLabelText(/mật khẩu/i), 'wrongpass');
  await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

  await waitFor(() => {
    expect(screen.getByText(/email hoặc mật khẩu không đúng/i)).toBeInTheDocument();
  });
});
```

---

## Bước 4 — Test Context

**Học được:** Wrap component trong Provider khi test — không dùng context thật.

**Pattern: tạo custom render helper**

```jsx
// src/test/utils.jsx
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LangProvider } from '../context/LangContext';
import { ThemeProvider } from '../context/ThemeContext';

export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
```

**Dùng:**
```jsx
import { renderWithProviders } from '../test/utils';

test('hiện tên user khi đăng nhập', () => {
  // Set localStorage trước khi render
  localStorage.setItem('fwm-user', JSON.stringify({ name: 'Nguyễn Văn A', role: 'user' }));
  localStorage.setItem('fwm-token', 'fake-token');

  renderWithProviders(<SiteHeader />);

  expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
});
```

---

## Bước 5 — Test Custom Hook (renderHook)

**Học được:** `renderHook` — test hook trong isolation, không cần component.

**File test:** `src/hooks/useComments.test.js`

```jsx
import { renderHook, waitFor } from '@testing-library/react';
import { useComments } from './useComments';

// Mock API
vi.mock('../api/comments', () => ({
  getComments: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
}));
import { getComments } from '../api/comments';

test('load comments khi mount', async () => {
  const mockComments = [
    { _id: '1', text: 'Hello', author: { name: 'User A' }, createdAt: new Date().toISOString() }
  ];
  getComments.mockResolvedValue(mockComments);

  const { result } = renderHook(() => useComments('post-123'));

  // Đang loading
  expect(result.current.loading).toBe(true);

  // Đợi fetch xong
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.comments).toHaveLength(1);
  expect(result.current.comments[0].text).toBe('Hello');
});

test('addComment thêm vào state', async () => {
  getComments.mockResolvedValue([]);
  addComment.mockResolvedValue({ _id: '2', text: 'New comment', author: { name: 'Me' } });

  const { result } = renderHook(() => useComments('post-123'), {
    wrapper: AuthProvider  // hook cần AuthContext
  });

  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => {
    await result.current.addComment('New comment');
  });

  expect(result.current.comments).toHaveLength(1);
});
```

---

## Bước 6 — Snapshot Testing

**Học được:** Snapshot — chụp ảnh output của component, so sánh với lần chạy trước để phát hiện thay đổi ngoài ý muốn.

```jsx
import { render } from '@testing-library/react';
import ArticleCard from './ArticleCard';

const mockArticle = {
  id: '1',
  title: { vi: 'Tiêu đề', en: 'Title' },
  excerpt: { vi: 'Mô tả', en: 'Desc' },
  category: 'skill',
  tags: [],
};

test('khớp snapshot', () => {
  const { container } = render(
    <BrowserRouter>
      <ArticleCard article={mockArticle} />
    </BrowserRouter>
  );
  expect(container).toMatchSnapshot();
});
```

Lần đầu chạy: tạo file `.snap`. Lần sau: so sánh với `.snap`.
Nếu UI đổi có chủ đích: chạy `npm run test -- --update-snapshots`.

**Khi nào dùng snapshot?** Cho component UI thuần (không có logic) để phát hiện thay đổi vô tình.
Đừng snapshot component phức tạp — snapshot quá lớn sẽ không ai đọc khi fail.

---

## Bước 7 — Coverage Report

**Học được:** Coverage báo % code được test cover — tìm ra phần nào chưa test.

```bash
npm run test -- --coverage
```

Output:
```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
components/ui/Button.jsx|   100   |    85    |   100   |   100
context/AuthContext.jsx  |    60   |    50    |    70   |    60  ← cần thêm test
hooks/useComments.js    |    80   |    75    |    80   |    80
```

**Mục tiêu thực tế:** 70-80% coverage là tốt. 100% coverage không đảm bảo không bug — chỉ đảm bảo code được chạy qua.

Ưu tiên cover:
1. Logic nghiệp vụ (custom hooks, context)
2. Form validation
3. Error states

Không cần cover:
1. CSS/styling
2. Third-party library code
3. Simple presentational components

---

## Checklist sau module này

- [ ] Chạy được test với `npm run test`
- [ ] Viết được test cho component đơn giản
- [ ] Test được user interaction (click, type)
- [ ] Mock được API calls
- [ ] Test được component cần Context
- [ ] Dùng được `renderHook` để test custom hook
- [ ] Đọc được coverage report
