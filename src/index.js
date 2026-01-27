import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import "./styles/global.css";
import "./styles/app.css";
import "./styles/header.css";
import "./styles/property-list.css";
import "./styles/ai-search.css";

import "@fortawesome/fontawesome-free/css/all.min.css";

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
