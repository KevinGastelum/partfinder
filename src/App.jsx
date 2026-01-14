import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
// import Product from './pages/Product'
import Results from './pages/Results'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          {/* <Route path="/product/:id" element={<Product />} /> */}
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
