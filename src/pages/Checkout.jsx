
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import './Checkout.css';

const SERVICE_FEE_PERCENTAGE = 0.30;
const SHIPPING_COST_DEFAULT = 15.00;

export default function Checkout() {
  const { cart, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });

  const cartTotal = getCartTotal();
  const serviceFee = cartTotal * SERVICE_FEE_PERCENTAGE;
  const shipping = SHIPPING_COST_DEFAULT;
  const grandTotal = cartTotal + serviceFee + shipping;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Placeholder for Stripe Payment Intent creation & confirmation
      const simulatedPaymentId = 'pi_simulated_' + Math.random().toString(36).substr(2, 9);

      // 2. Create Order in Supabase
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            user_email: formData.email,
            // For MVP, if multiple items, we might need multiple order rows or a jsonb column.
            // Our schema has `listing_id` (single). Let's assume 1 item for now or just pick the first one.
            listing_id: cart[0].id, 
            status: 'paid', // Immediately paid since we simulated it
            stripe_payment_id: simulatedPaymentId,
            shipping_address: formData,
            item_price: cartTotal,
            service_fee: serviceFee,
            shipping_cost: shipping,
            total_amount: grandTotal
          }
        ])
        .select();

      if (error) throw error;

      console.log('Order created:', data);

      // Simulate Network Delay for "Payment Processing"
      setTimeout(() => {
        alert(`Payment Successful! Order ID: ${data[0].id}\nTotal: $${grandTotal.toFixed(2)}`);
        clearCart();
        setLoading(false);
        navigate('/');
      }, 1500);

    } catch (err) {
      console.error('Payment/Order Error:', err);
      alert('Payment failed: ' + err.message);
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Find Parts</button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      
      <div className="checkout-grid">
        {/* Shipping Form */}
        <div className="form-section">
          <h2>Shipping Information</h2>
          <form id="checkout-form" onSubmit={handlePayment}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
            </div>
            
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
            </div>

            <div className="form-group">
              <label>Street Address</label>
              <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="123 Main St" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input type="text" name="city" required value={formData.city} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input type="text" name="state" required value={formData.state} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>ZIP Code</label>
                <input type="text" name="zip" required value={formData.zip} onChange={handleInputChange} />
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="summary-section">
          <h2>Order Summary</h2>
          <div className="cart-items">
            {cart.map((item, index) => (
              <div key={index} className="summary-item">
                <img src={item.image} alt={item.title} className="summary-thumb" />
                <div className="summary-details">
                  <p className="summary-title">{item.title}</p>
                  <p className="summary-price">${item.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="cost-breakdown">
            <div className="cost-row">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="cost-row">
              <span>Service Fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="cost-row">
              <span>Shipping (Est.)</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="cost-row total">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="payment-placeholder">
            {/* Stripe Element would go here */}
            <div className="mock-card-element">
              💳 Credit Card Element (Stripe Placeholder)
            </div>
          </div>

          <button 
            type="submit" 
            form="checkout-form" 
            className="btn-pay"
            disabled={loading}
          >
            {loading ? 'Processing...' : `Pay $${grandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
