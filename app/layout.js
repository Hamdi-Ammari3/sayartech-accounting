import React from 'react'
import { Cairo } from 'next/font/google'
import './style.css'
import { GlobalStateProvider } from '../globalState'

const cairo = Cairo({
  subsets:['latin'],
  weight:['400','700'],
  display:'swap'
})

export const metadata = {
  title: "Sayartech",
  description: "Your kids journey to school is our mission",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={cairo.className} id='app-container'>
      <body>
        <GlobalStateProvider>
          {children}
        </GlobalStateProvider>       
      </body>
    </html>
  );
}
