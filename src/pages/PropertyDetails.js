import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import GalleryCarousel from "../components/GalleryCarousel";
import VideoModal from "../components/VideoModal";
import Amenities from "../components/Amenities";
import ImageZoomModal from "../components/ImageZoomModal";

import { BadgeCheck, Share2, Heart, Download } from "lucide-react";
import "../styles/property-details.css";

import NearbyLocations from "../components/NearbyLocations";
export default function PropertyDetails() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const [copyToast, setCopyToast] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState("");


  /* -------- FAVORITES -------- */
  const [favorite, setFavorite] = useState(() => {
    const saved = localStorage.getItem(`fav-${id}`);
    return saved === "true";
  });

  /* -------- BROCHURE MODAL -------- */
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [brochureStatus, setBrochureStatus] = useState("");
  const [brochureForm, setBrochureForm] = useState({
    name: "",
    mobile: "",
    email: ""
  });

  /* -----------------------------------------
          FETCH PROPERTY DETAILS
  ----------------------------------------- */
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/properties/${id}`);
        const data = await res.json();
        setProperty(data);
      } catch (err) {
        console.error("Failed to load property", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  /* -----------------------------------------
          FAVORITE TOGGLE
  ----------------------------------------- */
  const toggleFavorite = () => {
    const newValue = !favorite;
    setFavorite(newValue);
    localStorage.setItem(`fav-${id}`, newValue);
  };

  /* -----------------------------------------
           SHARE PROPERTY
  ----------------------------------------- */
  const handleShare = async () => {
    const shareData = {
      title: property?.title,
      text: "Check out this property!",
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {}
    }

    // Fallback → copy link
    navigator.clipboard.writeText(window.location.href);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 1500);
  };

  /* -----------------------------------------
        BROCHURE HANDLERS
  ----------------------------------------- */
  const openBrochure = () => {
    setBrochureForm({ name: "", mobile: "", email: "" });
    setBrochureStatus("");
    setShowBrochureModal(true);
  };

  const handleBrochureChange = (e) => {
    setBrochureForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isBrochureValid = () => {
    const { name, mobile } = brochureForm;
    if (!name || !mobile) return false;
    return /^[0-9]{10,15}$/.test(mobile);
  };

  const downloadFile = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "property-brochure.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleBrochureSubmit = async (e) => {
    e.preventDefault();

    setBrochureStatus("sending");

    try {
      const res = await fetch("http://localhost:8080/api/brochure/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brochureForm.name,
          mobile: brochureForm.mobile,
          email: brochureForm.email,
          propertyId: property.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setBrochureStatus("error");
        return;
      }

      // ⭐ Start Browser Download
      const downloadLink = document.createElement("a");
      downloadLink.href = "http://localhost:8080" + data.url;
      downloadLink.download = "";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setBrochureStatus("success");

      // Close modal after 1 sec
      setTimeout(() => {
        setShowBrochureModal(false);
        setBrochureStatus("");
      }, 1000);

    } catch (error) {
      console.error("Brochure error:", error);
      setBrochureStatus("error");
    }
  };


  /* -----------------------------------------
        CONDITIONAL RENDER AFTER HOOKS
  ----------------------------------------- */

  if (loading) return <p className="loading">Loading...</p>;
  if (!property) return <p className="loading">Property not found</p>;

  /* -----------------------------------------
         GALLERY + VIDEO SOURCES
  ----------------------------------------- */
  const galleryImages =
    property.images?.length > 0
      ? property.images
      : property.mainImages?.length > 0
      ? property.mainImages
      : [property.image];

  const videoThumbnail =
    property.mainImages?.[0] ||
    property.images?.[0] ||
    property.image ||
    "/images/default-video-thumb.jpg";

  /* -----------------------------------------
                JSX RETURN
  ----------------------------------------- */

  return (
    <div className="details-container">

      <Link to="/" className="back-btn">← Back to Listings</Link>

      {/* HEADER */}
      <div className="details-header-row">

        <div>
          <h1 className="details-title">{property.title}</h1>
          <p className="details-location">📍 {property.location}</p>
                    {/* NO BROKERAGE */}
                    <div className="no-brokerage">
                      <BadgeCheck className="no-brokerage-icon" />
                      No Brokerage
                    </div>
        </div>

        <div className="top-actions">

       {/* BOOK MEETING */}
       <div className="tooltip-wrapper">
         <a
           href="https://calendly.com/hemanth-ogm/30min"
           target="_blank"
           rel="noreferrer"
           className="action-btn"
         >
           <svg
             xmlns="http://www.w3.org/2000/svg"
             width="24"
             height="24"
             fill="none"
             stroke="#2563eb"
             strokeWidth="2"
             strokeLinecap="round"
             strokeLinejoin="round"
           >
             <rect x="3" y="4" width="18" height="18" rx="2"></rect>
             <line x1="16" y1="2" x2="16" y2="6"></line>
             <line x1="8" y1="2" x2="8" y2="6"></line>
             <line x1="3" y1="10" x2="21" y2="10"></line>
           </svg>
         </a>
         <span className="tooltip">Book a Meeting</span>
       </div>

       {/* CALL NOW */}
       <div className="tooltip-wrapper">
         <a
           href="tel:+919876543210"
           className="action-btn call-btn"
           style={{ pointerEvents: "auto" }}
         >
           <svg
             xmlns="http://www.w3.org/2000/svg"
             width="24"
             height="24"
             fill="none"
             stroke="#059669"
             strokeWidth="2"
             strokeLinecap="round"
             strokeLinejoin="round"
           >
             <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79
               0 0111.19 18a19.5 19.5 0 01-6-6
               A19.79 19.79 0 012.1 4.18
               2 2 0 014.11 2h3a2 2 0 012
               1.72c.07.96.26 1.9.56
               2.81a2 2 0 01-.45 2.11L8.09
               10a16 16 0 006 6l1.36-1.27a2 2
               0 012.11-.45c.91.3 1.85.49
               2.81.7A2 2 0 0122 16.92z"/>
           </svg>
         </a>
         <span className="tooltip">Call Now</span>
       </div>


        {/* DOWNLOAD BROCHURE */}
        <div className="tooltip-wrapper">
          <button className="action-btn" onClick={openBrochure}>
            <Download className="share-icon" strokeWidth={2} size={24} />
          </button>
          <span className="tooltip">Download Brochure</span>
        </div>

        {/* SHARE */}
        <div className="tooltip-wrapper">
          <button className="action-btn" onClick={handleShare}>
            <Share2 className="share-icon" strokeWidth={2} size={24} />
          </button>
          <span className="tooltip">Share</span>
        </div>

        {/* FAVORITE */}
        <div className="tooltip-wrapper">
          <button className="action-btn" onClick={toggleFavorite}>
            <Heart
              className="share-icon"
              size={24}
              strokeWidth={2}
              color={favorite ? "red" : "#0ea5e9"}
              fill={favorite ? "red" : "none"}
            />
          </button>
          <span className="tooltip">
            {favorite ? "Remove from Wishlist" : "Add to Wishlist"}
          </span>
        </div>

        </div>
      </div>

      {/* PRICE */}
      <div className="details-top-info">
        <span className="details-price">{property.price}</span>
        {property.reraApproved && (
          <span className="rera-tag">RERA Approved</span>
        )}
      </div>

      {/* MEDIA: GALLERY + VIDEO */}
      <div className="media-wrapper">

        <div className="gallery-left">
          <GalleryCarousel
            images={galleryImages}
            autoplay={true}
            interval={4500}
            onImageClick={(i) => {
              setZoomImage(galleryImages[i]);
              setZoomOpen(true);
            }}
          />
        </div>

        <div className="video-right">
          <div className="video-card" onClick={() => setIsVideoOpen(true)}>
            <img src={videoThumbnail} className="video-thumb" alt="thumb" />
            <div className="video-dark-overlay" />
            <div className="video-play-button">▶</div>
          </div>
        </div>

      </div>

      {/* ZOOM MODAL */}
      <ImageZoomModal
        open={zoomOpen}
        image={zoomImage}
        onClose={() => setZoomOpen(false)}
      />

      {/* SPECS */}
      <div className="spec-grid">
        <div className="spec-box"><b>{property.bedrooms}</b> Bedrooms</div>
        <div className="spec-box"><b>{property.bathrooms}</b> Bathrooms</div>
        <div className="spec-box"><b>{property.carpetArea}</b> Carpet Area</div>
        <div className="spec-box"><b>{property.parking}</b> Parking</div>
      </div>

      {/* DETAILS */}
      <div className="details-section">
        <h2>Property Details</h2>
        <div className="details-table">
          <div><span>Type:</span><b>{property.type}</b></div>
          <div><span>Built-up Area:</span><b>{property.builtupArea}</b></div>
          <div><span>Facing:</span><b>{property.facing}</b></div>
          <div><span>Furnishing:</span><b>{property.furnishing}</b></div>
          <div><span>Maintenance:</span><b>{property.maintenance}</b></div>
        </div>
      </div>

<div className="premium-description">
  <div className="desc-left">
    <h2>Property Overview</h2>
  </div>

  <div className="desc-right">
    <p>{property.description}</p>
  </div>
</div>

{/* NEARBY LOCATIONS */}
<NearbyLocations locations={property.nearby || []} />

      {/* AMENITIES */}
      <div className="details-section">
        <h2>Features & Amenities</h2>
        <Amenities amenities={property.amenities || []} />
      </div>

      {/* MAP */}
      <div className="details-section">
        <h2>Location Map</h2>
        <div className="map-wrapper">
          <iframe
            title="Google Map"
            width="100%"
            height="100%"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              property.location
            )}&output=embed`}
          ></iframe>
        </div>
      </div>

      {/* VIDEO MODAL */}
      <VideoModal
        open={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={property.videoUrl}
      />

      {/* BROCHURE MODAL */}
      {showBrochureModal && (
        <div className="modal-overlay">
          <div className="modal-content">

            <h3>Download Brochure</h3>
            <p>Please enter your details to download.</p>

            <form onSubmit={handleBrochureSubmit}>

              <div className="input-group">
                <label>Name *</label>
                <input
                  name="name"
                  type="text"
                  value={brochureForm.name}
                  onChange={handleBrochureChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>Mobile *</label>
                <input
                  name="mobile"
                  type="tel"
                  value={brochureForm.mobile}
                  onChange={handleBrochureChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>Email (optional)</label>
                <input
                  name="email"
                  type="email"
                  value={brochureForm.email}
                  onChange={handleBrochureChange}
                />
              </div>

              <div className="modal-btn-group">
                <button type="submit" className="submit-btn">
                  {brochureStatus === "sending" ? "Sending..." : "Download"}
                </button>

                <button
                  type="button"
                  className="modal-btn"
                  onClick={() => setShowBrochureModal(false)}
                >
                  Cancel
                </button>
              </div>

              {brochureStatus === "error" && (
                <p style={{ color: "red", marginTop: "10px" }}>
                  Please check your details and try again.
                </p>
              )}

              {brochureStatus === "success" && (
                <p style={{ color: "green", marginTop: "10px" }}>
                  Brochure downloaded successfully!
                </p>
              )}

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
