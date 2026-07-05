import React, { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState('checking…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(`${d.status} (${d.app})`))
      .catch(() => setHealth('unreachable'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>DemoApp</h1>
      <p>A multi-user-ready web application shell — Spring Boot · React · PostgreSQL.</p>
      <p>
        Backend health: <strong>{health}</strong>
      </p>
      <hr />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        This is the generated empty project. Business entities are added in later steps.
      </p>
    </main>
  );
}
