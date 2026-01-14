
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Search from '../components/Search';

const Home = () => {
  const navigate = useNavigate();

  const handleSearch = (criteria) => {
    // Navigate to results with query params
    const query = new URLSearchParams(criteria).toString();
    navigate(`/results?${query}`);
  };

  return (
    <div className="home-page container">
       <div style={{ padding: '4rem 0 2rem', textAlign: 'center' }}>
          <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1.1 }}>
            Find Your Part<br/>
            <span style={{ color: 'var(--text-primary)', fontSize: '2rem' }}>At The Best Price.</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            We scour the internet to find you the best deals on new and used car parts. One search, hundreds of stores.
          </p>
          
          <Search onSearch={handleSearch} />
          
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
            <div className="feature-card">
               <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Centralized Search</h3>
               <p style={{ color: 'var(--text-secondary)' }}>Amazon, eBay, RockAuto, and more in one place.</p>
            </div>
            <div className="feature-card">
               <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Best Prices</h3>
               <p style={{ color: 'var(--text-secondary)' }}>Compare prices instantly including shipping and fees.</p>
            </div>
            <div className="feature-card">
               <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Verified Parts</h3>
               <p style={{ color: 'var(--text-secondary)' }}>Filter by condition: New, Used, or Refurbished.</p>
            </div>
          </div>
       </div>
    </div>
  );
};

export default Home;
