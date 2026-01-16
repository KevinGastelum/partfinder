
import React, { useState, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { getYears, getMakes, getModels } from '../services/vehicles';
import './Search.css';

const Search = ({ onSearch }) => {
  const [formData, setFormData] = useState({
    year: '',
    make: '',
    model: '',
    part: ''
  });

  const [options, setOptions] = useState({
    years: [],
    makes: [],
    models: []
  });

  const [loading, setLoading] = useState({
    years: false,
    makes: false,
    models: false
  });


  // 1. Fetch Years on Mount
  useEffect(() => {
    const fetchYears = async () => {
      setLoading(prev => ({ ...prev, years: true }));
      try {
        const years = await getYears();
        if (years && years.length > 0) {
          setOptions(prev => ({ ...prev, years }));
        } else {
          // Fallback if empty
          setOptions(prev => ({ ...prev, years: [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013] }));
        }
      } catch (err) {
        console.error('Failed to fetch years:', err);
        // Use inline fallback on error
        setOptions(prev => ({ ...prev, years: [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013] }));
      } finally {
        setLoading(prev => ({ ...prev, years: false }));
      }
    };
    fetchYears();
  }, []);


  // 2. Fetch Makes when Year changes
  useEffect(() => {
    if (!formData.year) {
      setOptions(prev => ({ ...prev, makes: [], models: [] }));
      return;
    }
    const fetchMakes = async () => {
      setLoading(prev => ({ ...prev, makes: true }));
      try {
        const makes = await getMakes(formData.year);
        const fallbackMakes = ['TOYOTA', 'HONDA', 'FORD', 'CHEVROLET', 'NISSAN', 'BMW', 'MERCEDES-BENZ', 'AUDI'];
        setOptions(prev => ({ ...prev, makes: makes && makes.length > 0 ? makes : fallbackMakes, models: [] }));
      } catch (err) {
        console.error('Failed to fetch makes:', err);
        setOptions(prev => ({ ...prev, makes: ['TOYOTA', 'HONDA', 'FORD', 'CHEVROLET', 'NISSAN', 'BMW', 'MERCEDES-BENZ', 'AUDI'], models: [] }));
      } finally {
        setLoading(prev => ({ ...prev, makes: false }));
      }
    };
    fetchMakes();
  }, [formData.year]);

  // 3. Fetch Models when Make changes
  useEffect(() => {
    if (!formData.year || !formData.make) {
      setOptions(prev => ({ ...prev, models: [] }));
      return;
    }
    const fetchModels = async () => {
      setLoading(prev => ({ ...prev, models: true }));
      try {
        const models = await getModels(formData.year, formData.make);
        const fallbackModels = ['Camry', 'Corolla', 'Civic', 'Accord', 'F-150', 'Silverado', 'Altima', 'Sentra', '3 Series', 'C-Class', 'A4'];
        setOptions(prev => ({ ...prev, models: models && models.length > 0 ? models : fallbackModels }));
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setOptions(prev => ({ ...prev, models: ['Camry', 'Corolla', 'Civic', 'Accord', 'F-150', 'Silverado', 'Altima', 'Sentra', '3 Series', 'C-Class', 'A4'] }));
      } finally {
        setLoading(prev => ({ ...prev, models: false }));
      }
    };
    fetchModels();
  }, [formData.make, formData.year]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Reset downstream selections
    if (name === 'year') {
      setFormData({ ...formData, year: value, make: '', model: '' });
    } else if (name === 'make') {
      setFormData({ ...formData, make: value, model: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
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
          <select name="year" value={formData.year} onChange={handleChange} className="input-field" disabled={loading.years}>
            <option value="">Select Year</option>
            {options.years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Make</label>
          <select name="make" value={formData.make} onChange={handleChange} className="input-field" disabled={!formData.year || loading.makes}>
            <option value="">Select Make</option>
            {options.makes.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Model</label>
          <select name="model" value={formData.model} onChange={handleChange} className="input-field" disabled={!formData.make || loading.models}>
            <option value="">Select Model</option>
            {options.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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

        <button type="submit" className="btn btn-primary search-btn" disabled={!formData.model || !formData.part}>
          <SearchIcon size={20} />
          <span>Find Parts</span>
        </button>
      </form>
    </div>
  );
};

export default Search;
