
import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import './Search.css';

const Search = ({ onSearch }) => {
  const [formData, setFormData] = useState({
    year: '',
    make: '',
    model: '',
    part: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(formData);
    }
  };

  return (
    <div className="search-container glass-panel">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label>Year</label>
          <select name="year" value={formData.year} onChange={handleChange} className="input-field">
            <option value="">Select Year</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            {/* Add more years */}
          </select>
        </div>
        
        <div className="form-group">
          <label>Make</label>
          <select name="make" value={formData.make} onChange={handleChange} className="input-field">
            <option value="">Select Make</option>
            <option value="toyota">Toyota</option>
            <option value="honda">Honda</option>
            <option value="ford">Ford</option>
            <option value="bmw">BMW</option>
          </select>
        </div>

        <div className="form-group">
          <label>Model</label>
          <input 
            type="text" 
            name="model" 
            placeholder="e.g. Camry" 
            value={formData.model} 
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>Part Name</label>
          <input 
            type="text" 
            name="part" 
            placeholder="e.g. Alternator" 
            value={formData.part} 
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <button type="submit" className="btn btn-primary search-btn">
          <SearchIcon size={20} />
          <span>Find Best Deal</span>
        </button>
      </form>
    </div>
  );
};

export default Search;
