import React from 'react';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import Ticker from '../components/landing/Ticker';
import TiposDeNegocio from '../components/landing/TiposDeNegocio';
import ComoFunciona from '../components/landing/ComoFunciona';
import BotWhatsApp from '../components/landing/BotWhatsApp';
import Funciones from '../components/landing/Funciones';
import Explorar from '../components/landing/Explorar';
import Precios from '../components/landing/Precios';
import CTAFinal from '../components/landing/CTAFinal';
import Footer from '../components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-space-bg font-sans text-space-text">
      <Nav />
      <Hero />
      <Ticker />
      <TiposDeNegocio />
      <ComoFunciona />
      <BotWhatsApp />
      <Funciones />
      <Explorar />
      <Precios />
      <CTAFinal />
      <Footer />
    </div>
  );
}
