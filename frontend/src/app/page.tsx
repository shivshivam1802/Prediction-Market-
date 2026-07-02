'use client';

import React from 'react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-xl p-8 rounded-2xl glass shadow-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          Polymarket Clone
        </h1>
        <p className="mt-4 text-lg text-secondary">
          Decentralized Prediction Market Platform. Scaffolded successfully using Next.js 15, Tailwind CSS & TS.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <a
            href="/api/docs"
            target="_blank"
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition duration-200"
          >
            Backend API Docs
          </a>
          <button
            onClick={() => {
              const html = document.querySelector('html');
              if (html) {
                html.classList.toggle('dark');
              }
            }}
            className="px-6 py-3 border border-border bg-card text-foreground font-medium rounded-lg hover:bg-opacity-80 transition duration-200"
          >
            Toggle Dark/Light Mode
          </button>
        </div>
      </div>
    </div>
  );
}
