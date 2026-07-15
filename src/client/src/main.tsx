import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CompleteApp from './CompleteApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><CompleteApp /></BrowserRouter></React.StrictMode>);
