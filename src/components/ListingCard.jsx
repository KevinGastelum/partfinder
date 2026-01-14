import React from 'react';
import './ListingCard.css';
import { ExternalLink, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

const ListingCard = ({ listing }) => {
  const { title, price, store, condition, image, link, serviceFee } = listing;

  const totalPrice = (parseFloat(price) + parseFloat(serviceFee || 0)).toFixed(2);

  return (
    <div className="listing-card glass-panel">
      <div className="listing-image">
        <img src={image || 'https://via.placeholder.com/300x200?text=No+Image'} alt={title} />
        <div className="listing-badge">{condition || 'Used'}</div>
      </div>
      <div className="listing-content">
        <h3 className="listing-title">{title}</h3>
        <div className="listing-meta">
          <span className="store-name"><Tag size={14} /> {store}</span>
        </div>
        
        <div className="listing-price-area">
            <div className="price-breakdown">
                <span className="original-price">${price}</span>
                <span className="fee-label">+ ${(parseFloat(serviceFee)).toFixed(2)} fee</span>
            </div>
            <div className="total-price">${totalPrice}</div>
        </div>

        <Link to={`/product/${listing.id}`} className="btn btn-primary buy-btn">
          <span>View Deal</span>
          <ExternalLink size={16} />
        </Link>
      </div>
    </div>
  );
};

export default ListingCard;
