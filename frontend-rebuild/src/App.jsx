import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLogin from './pages/AdminLogin'
import Home from './pages/Home'
import Category from './pages/Category'
import ArticleDetail from './pages/ArticleDetail';
import Search from './pages/Search'
import Favorites from './pages/Favorites'
import Admin from './pages/Admin';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/chuyen-muc" element={<Category></Category>} />
        <Route path="/chuyen-muc/:id" element={<Category />}></Route>
        <Route path="/bai-viet/:id" element={<ArticleDetail />}></Route>
        <Route path="/tim-kiem" element={<Search />} ></Route>
        <Route path='/yeu-thich' element={<Favorites />}></Route>
        <Route path='/admin' element={<Admin/>}></Route>
        <Route path='/gioi-thieu' element={<About/>} />
        <Route path='/lien-he' element={<Contact/>} />
        <Route path='*' element={<NotFound/>}></Route>
      </Route>
    </Routes>
  );
}

export default App;