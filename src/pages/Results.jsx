
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import { searchListings } from '../services/listings';

const Results = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  const criteria = {
    year: searchParams.get('year'),
    make: searchParams.get('make'),
    model: searchParams.get('model'),
    part: searchParams.get('part'),
  };

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await searchListings(criteria);
        setResults(data);
      } catch (error) {
        console.error("Failed to fetch", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchParams]);

  return (
    <div className="results-page container" style={{ padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>
          Results for <span className="text-gradient">{criteria.part || 'Parts'}</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {criteria.year} {criteria.make} {criteria.model}
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="loading-spinner" style={{ 
              width: '40px', height: '40px', border: '3px solid var(--bg-card)', 
              borderTop: '3px solid var(--primary)', borderRadius: '50%', 
              margin: '0 auto 1rem', animation: 'spin 1s linear infinite' 
          }}></div>
          <p>Scouring the web...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="results-grid" style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' 
        }}>
          {results.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Results;
