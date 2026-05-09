import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './HomePage/Navbar'; 
import LoginPage from './LoginPage/LoginPage';
import Register from './RigsterPage/Rigster';
import ForgetPassword from './pages/forgetPass/ForgetPassword';
import Home from './HomePage/home.jsx';
import AddOrder from './AddOrder/AddOrder.jsx';
import MyProducts from './myProduct/myProducts.jsx';
import AllRequests from './Admin/AllRequests.jsx';
import ProductDetails from './HomePage/ProductDetails.jsx'; 
import MyRequests from './myRequestPage/MyRequests.jsx'; // دي اللي هتبقى صفحة Grants
import sellerRequests from './sellerRequestpage/SellerRequests.jsx';
import Cart from './HomePage/Cart';

function App() {
  const [role, setRole] = useState(localStorage.getItem("userRole") || "");

  // ✅ السيرش global
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (role) {
      localStorage.setItem("userRole", role);
    } else {
      localStorage.removeItem("userRole");
    }
  }, [role]);

  return (
    <Router>
      <Navbar 
        role={role} 
        setRole={setRole} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <Routes>
        <Route path="/" element={<Home role={role} searchQuery={searchQuery} />} />
        <Route path="/home" element={<Home role={role} searchQuery={searchQuery} />} />
        <Route path="/login" element={<LoginPage setRole={setRole} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forget-password" element={<ForgetPassword />} />
        
        {/* الجزء الخاص بإضافة المنتجات وإدارة منتجاتي */}
        <Route path="/AddOrder" element={<AddOrder />} />
        <Route path="/my-product" element={<MyProducts />} />

        {/* الجزء الخاص بالبيع والشراء التقليدي */}
        <Route path="/cart" element={<Cart />} />

        {/* --- الجزء التطوعي البروفيشنال --- */}
        
        {/* 1. صفحة الأدمن لمراجعة طلبات التطوع (Verification) */}
        <Route path="/all-requests" element={<AllRequests />} />

        {/* 2. صفحة الطالب لمتابعة طلبات المساعدة (My Grants) */}
        <Route path="/my-requests" element={<MyRequests />} />

        {/* 3. صفحة المتبرع لموافقة الطالب النهائي (Donation Approvals) */}
        <Route path="/seller-requests" element={<SellerRequests />} />

        {/* تفاصيل المنتج */}
        <Route path="/product/:id" element={<ProductDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
