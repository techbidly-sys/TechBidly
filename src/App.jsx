import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Browse from './pages/Browse.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import Sell from './pages/Sell.jsx';
import Orders from './pages/Orders.jsx';
import Profile from './pages/Profile.jsx';
import Watchlist from './pages/Watchlist.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
