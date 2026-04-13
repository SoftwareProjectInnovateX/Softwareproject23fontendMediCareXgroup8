import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Checkout from './pages/customer/Checkout';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Checkout Route එක මෙතන තියෙනවා */}
          <Route path="/checkout" element={<Checkout />} />
          
          {/* Default Route එක විදිහට Checkout එක දැනට පාවිච්චි කරමු */}
          <Route path="/" element={<Checkout />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;