import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Home from './pages/Home'

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Category = lazy(() => import('./pages/Category'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const Search = lazy(() => import('./pages/Search'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Admin = lazy(() => import('./pages/Admin'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

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
        <Route path='/ho-so' element={<Profile/>} />
        <Route path='/nguoi-dung/:id' element={<PublicProfile/>} />
        <Route path="/quen-mat-khau" element={<ForgotPassword/>}/>
        <Route path="/dat-lai-mat-khau/:token" element={<ResetPassword/>}/>
        <Route path="/xac-thuc-email/:token" element={<VerifyEmail/>}/>
        <Route path='*' element={<NotFound/>}></Route>
      </Route>
    </Routes>
  );
}

export default App;
