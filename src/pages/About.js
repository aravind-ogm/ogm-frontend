import React from "react";
import "./About.css";

export default function About() {
  return (
    <div className="about-container">

      {/* SECTION 1 — Kids Need Space */}
      <div className="about-row right-img">
        <div className="about-text">
          <h2>Kids Need Space, Not Just a Home</h2>
          <p>
            Children thrive when homes are designed with freedom, safety, and creativity in mind.
            We help families choose communities that offer open areas, parks, amenities, and an
            environment where kids can grow and explore.
          </p>
        </div>

        <div className="about-img-wrap">
          <img src="/images/kids.png" alt="Kids" className="about-img" />
        </div>
      </div>

      {/* SECTION 2 — Elders Need Company */}
      <div className="about-row left-img">
        <div className="about-img-wrap">
          <img src="/images/elders.png" alt="Elders" className="about-img" />
        </div>

        <div className="about-text">
          <h2>Elders Need Company, Not Just a Shelter</h2>
          <p>
            A good home is one where seniors feel supported, cared for, and surrounded by community.
            We guide families to homes offering comfort, accessibility, and peace of mind.
          </p>
        </div>
      </div>

      {/* SECTION 3 — Couple Comfort */}
      <div className="about-row right-img">
        <div className="about-text">
          <h2>A Couple Needs Comfort, Not Just a Couch to Crash</h2>
          <p>
            Modern couples seek a blend of convenience, comfort, and lifestyle amenities. We help
            them find spaces that match their aspirations and routines.
          </p>
        </div>

        <div className="about-img-wrap">
          <img src="/images/couple.png" alt="Couple" className="about-img" />
        </div>
      </div>

      {/* MAIN COMPANY TEXT */}
      <div className="about-main-copy">
        <p>
          One Global Marketplace is an End to End customer service and support solution where we help our customers choose their home within their budget, proximity, amenities and whatever bengaluru offers. Every step of the way, we ensure our customers are being addressed through thick and thin.

          We are not typical real estate agents, we are a group of professional individuals building a platform for customers to make the right choice. We will ensure you have all the information at your fingertips but you take the call.

        </p>
      </div>

    </div>
  );
}
