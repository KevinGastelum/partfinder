
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './Checkout.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ clientSecret, amount, cart, shippingDetails }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/`, // Redirects to home after success (or handle locally)
      },
      redirect: "if_required", // Prevent redirect if handled locally
    });

    if (error) {
      setMessage(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      
      // Payment Successful - Create Order
      try {
        const { data, error: dbError } = await supabase
        .from('orders')
        .insert([
          {
            user_email: shippingDetails.email,
            listing_id: cart[0].id, 
            status: 'paid',
            stripe_payment_id: paymentIntent.id,
            shipping_address: shippingDetails,
            item_price: amount.itemTotal, // We need to pass broken down costs or re-calc
            service_fee: amount.serviceFee,
            shipping_cost: amount.shipping,
            total_amount: amount.grandTotal
          }
        ]);

        if (dbError) throw dbError;

        alert(`Payment Succeeded! Order created.`);
        clearCart();
        navigate('/');

      } catch (err) {
        console.error("Order creation failed after payment:", err);
        setMessage("Payment succeeded but order creation failed. Please contact support.");
      }
      
      setIsProcessing(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement />
      {message && <div id="payment-message" style={{color: 'red', marginTop: '10px'}}>{message}</div>}
      <button disabled={isProcessing || !stripe || !elements} id="submit" className="btn-pay" style={{marginTop: '20px'}}>
        <span id="button-text">
          {isProcessing ? "Processing..." : `Pay $${amount.grandTotal.toFixed(2)}`}
        </span>
      </button>
    </form>
  );
};

export default function Checkout() {
  const { cart, getCartTotal } = useCart();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState("");
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });

  const cartTotal = getCartTotal();
  const serviceFee = cartTotal * 0.30;
  const shipping = 15.00;
  const grandTotal = cartTotal + serviceFee + shipping;

  useEffect(() => {
    if (cart.length === 0) return;

    // Fetch PaymentIntent from backend
    // Note: In local dev, you must serve the Function or use a placeholder if you can't run Deno.
    // For this environment, we assume the user will deploy or run it. 
    // If we can't run it, we might need to Mock it or use a public URL.
    // Let's assume standard Supabase Function invocation:
    
    const fetchPaymentIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { cartItems: cart.map(item => ({ id: item.id })) }
        });

        if (error) console.error('Error creating payment intent:', error);
        if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
        }
      } catch (err) {
        console.error("Function invoke error:", err);
      }
    };

    fetchPaymentIntent();
  }, [cart]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Find Parts</button>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe',
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      
      <div className="checkout-grid">
        {/* Shipping Form (Collection Only) */}
        <div className="form-section">
          <h2>Shipping Information</h2>
          <form>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
            </div>
            {/* ... other fields ... */}
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

        {/* Order Summary & Payment */}
        <div className="summary-section">
          <h2>Order Summary</h2>
          {/* ... Summary Logic ... */}
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
              <span>${(grandTotal - cartTotal - shipping).toFixed(2)}</span>
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

          <div className="payment-placeholder" style={{marginTop: '20px'}}>
             {clientSecret ? (
                <Elements options={options} stripe={stripePromise}>
                  <CheckoutForm 
                    clientSecret={clientSecret} 
                    amount={{itemTotal: cartTotal, serviceFee: serviceFee, shipping: shipping, grandTotal: grandTotal}} 
                    cart={cart}
                    shippingDetails={formData}
                  />
                </Elements>
              ) : (
                <div style={{textAlign: 'center', padding: '20px'}}>Loading Payment Securely...<br/><small>(Ensure Supabase Edge Function is running)</small></div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
