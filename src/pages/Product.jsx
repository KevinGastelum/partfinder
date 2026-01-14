
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getListingById } from '../services/listings';
import { ArrowLeft, ExternalLink, ShieldCheck, Truck } from 'lucide-react';
import './Product.css';

const Product = () => {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getListingById(id);
        setListing(data);
      } catch (err) {
        setError("Could not load product details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="loading-container">Loading...</div>;
  if (error) return <div className="error-container">{error}</div>;
  if (!listing) return <div className="error-container">Product not found.</div>;

  const totalPrice = (parseFloat(listing.price) + parseFloat(listing.serviceFee)).toFixed(2);

  return (
    <div className="product-page container">
      <Link to="/results" className="back-link">
        <ArrowLeft size={20} />
        Back to Results
      </Link>
      
      <div className="product-grid glass-panel">
        <div className="product-image-container">
          <img src={listing.image || 'https://via.placeholder.com/600x400'} alt={listing.title} />
          <div className="product-badge">{listing.condition}</div>
        </div>
        
        <div className="product-details">
          <div className="product-header">
            <h1 className="product-title">{listing.title}</h1>
            <p className="product-subtitle">
              {listing.year} {listing.make} {listing.model} - {listing.store}
            </p>
          </div>

          <div className="pricing-card">
            <div className="price-row">
              <span>Part Price</span>
              <span>${listing.price}</span>
            </div>
            <div className="price-row fee">
              <span>Service Fee</span>
              <span>${parseFloat(listing.serviceFee).toFixed(2)}</span>
            </div>
            <div className="price-divider"></div>
            <div className="price-row total">
              <span>Total</span>
              <span className="text-gradient">${totalPrice}</span>
            </div>
          </div>

          <div className="trust-badges">
            <div className="badge-item">
              <ShieldCheck className="icon-success" />
              <span>Verified Seller</span>
            </div>
            <div className="badge-item">
              <Truck className="icon-primary" />
              <span>Fast Shipping Available</span>
            </div>
          </div>

          <a href={listing.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary buy-btn-large">
            <span>Proceed to Checkout</span>
            <ExternalLink size={20} />
          </a>
          
          <p className="disclaimer">
            * You will be redirected to {listing.store} to complete your purchase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Product;
