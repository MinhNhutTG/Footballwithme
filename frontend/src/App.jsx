import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Category from './pages/Category';
import ArticleDetail from './pages/ArticleDetail';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';


function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/chuyen-muc" element={<Category />} />
        <Route path="/chuyen-muc/:id" element={<Category />} />
        <Route path="/bai-viet/:id" element={<ArticleDetail />} />
        <Route path="/tim-kiem" element={<Search />} />
        <Route path="/yeu-thich" element={<Favorites />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/gioi-thieu" element={<About />} />
        <Route path="/lien-he" element={<Contact />} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/ho-so" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
