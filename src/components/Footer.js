import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const COLUMNS = [
  {
    title: "Company",
    links: [
      { label: "About Us",  to: "/about"   },
      { label: "Contact",   to: "/contact" },
      { label: "Careers",   to: "/careers" },
      { label: "Blog",      to: "/blog"    },
    ],
  },
  {
    title: "Properties",
    links: [
      { label: "Buy",           to: "/?type=buy"      },
      { label: "Rent",          to: "/?type=rent"     },
      { label: "New Projects",  to: "/?type=projects" },
      { label: "Weekend Homes", to: "/?type=weekend"  },
    ],
  },
  {
    title: "For Listing",
    links: [
      { label: "Register as Developer/Agent",    to: "/broker/register"          },
      { label: "Register via WhatsApp", to: "/broker/register#whatsapp" },
      { label: "Register via Google",   to: "/broker/register#google"   }
      // { label: "Terms & Conditions",    to: "/terms"                    },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy",     to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms"          },
      { label: "Customer Support",   to: "/support"        },
      { label: "Cookie Policy",      to: "/cookies"        },
    ],
  },
];

const SOCIALS = [
  { label: "Facebook",   href: "https://www.facebook.com/profile.php?id=61557363285101",  icon: "fab fa-facebook"   },
  { label: "Instagram",  href: "https://www.instagram.com/oneglobalmarketplace", icon: "fab fa-instagram"  },
  { label: "LinkedIn",   href: "https://in.linkedin.com/company/one-global-marketplace",  icon: "fab fa-linkedin"   },
  { label: "YouTube",    href: "https://youtube.com",   icon: "fab fa-youtube"    },
  { label: "X / Twitter",href: "https://x.com/worldofogm",         icon: "fab fa-x-twitter"  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
      <footer className="premium-footer" aria-label="Site footer">
        <div className="footer-container">

          {/* ── Brand column ── */}
          <div className="footer-brand">
            <img src="/logo.png" alt="OGM Logo" className="footer-logo" />
            <p className="footer-brand-text">
              One Global Marketplace — Connecting buyers and sellers through
              trusted real estate discovery across India.
            </p>
            <div className="footer-social">
              {SOCIALS.map(({ label, href, icon }) => (
                  <a key={label} href={href} target="_blank"
                     rel="noopener noreferrer" aria-label={label}>
                    <i className={icon} />
                  </a>
              ))}
            </div>
          </div>

          {/* ── Nav columns ── */}
          {COLUMNS.map(({ title, links }) => (
              <nav key={title} className="footer-col" aria-label={title}>
                <div className="footer-col-title">{title}</div>
                <div className="footer-links-card">
                  {links.map(({ label, to }) => (
                      <Link key={label} to={to}>{label}</Link>
                  ))}
                </div>
              </nav>
          ))}

        </div>

        {/* ── Bottom bar ── */}
        <div className="footer-bottom">
          <p className="footer-disclaimer">
            OGM acts only as a platform to display real estate listings.
            All information is provided directly by sellers or developers.
            RERA registrations are the responsibility of respective developers.
          </p>
          <p className="footer-copy">
            © {year} One Global Marketplace Pvt. Ltd. · All Rights Reserved ·
            Bengaluru, Karnataka, India
          </p>
        </div>
      </footer>
  );
}