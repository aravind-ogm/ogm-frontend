import React from "react";
import "../styles/PrivacyPolicy.css";

const Section = ({ title, children }) => (
  <section className="pp-section">
    {title && <h2 className="pp-h2">{title}</h2>}
    {children}
  </section>
);

const CookieCard = ({ title, type, admin, purpose }) => (
  <div className="pp-cookie-card">
    <div className="pp-cookie-title">{title}</div>
    <div className="pp-cookie-row"><span>Type</span><b>{type}</b></div>
    <div className="pp-cookie-row"><span>Administered by</span><b>{admin}</b></div>
    {purpose && <div className="pp-cookie-row"><span>Purpose</span><b>{purpose}</b></div>}
  </div>
);

const RetentionRow = ({ label, period }) => (
  <div className="pp-retention-row">
    <div className="pp-retention-label">{label}</div>
    <div className="pp-retention-period">{period}</div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div className="pp-page">
      <div className="pp-container">

        {/* ── Hero ── */}
        <div className="pp-hero">
          <div className="pp-hero-badge">Legal</div>
          <h1 className="pp-h1">Privacy Policy</h1>
          <p className="pp-last-updated">Last updated: January 29, 2026</p>
          <p className="pp-intro">
            This Privacy Policy describes Our policies and procedures on the collection,
            use and disclosure of Your information when You use the Service and tells You
            about Your privacy rights and how the law protects You. We use Your Personal
            Data to provide and improve the Service. By using the Service, You agree to
            the collection and use of information in accordance with this Privacy Policy.
          </p>
        </div>

        {/* ── Table of Contents ── */}
        <nav className="pp-toc">
          <div className="pp-toc-title">Contents</div>
          {[
            "Interpretation and Definitions",
            "Collecting and Using Your Personal Data",
            "Tracking Technologies and Cookies",
            "Use of Your Personal Data",
            "Retention of Your Personal Data",
            "Transfer of Your Personal Data",
            "Delete Your Personal Data",
            "Disclosure of Your Personal Data",
            "Security of Your Personal Data",
            "Children's Privacy",
            "Links to Other Websites",
            "Changes to this Privacy Policy",
            "Contact Us",
          ].map((item, i) => (
            <a key={i} href={`#section-${i}`} className="pp-toc-link">
              <span className="pp-toc-num">{String(i + 1).padStart(2, "0")}</span>
              {item}
            </a>
          ))}
        </nav>

        {/* ── Sections ── */}

        <Section id="section-0" title="Interpretation and Definitions">
          <h3 className="pp-h3">Interpretation</h3>
          <p>The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

          <h3 className="pp-h3">Definitions</h3>
          <p>For the purposes of this Privacy Policy:</p>
          <ul className="pp-list">
            <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
            <li><strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</li>
            <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Privacy Policy) refers to One Global Marketplace, Bengaluru, Karnataka.</li>
            <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
            <li><strong>Country</strong> refers to: Karnataka, India.</li>
            <li><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</li>
            <li><strong>Personal Data</strong> (or "Personal Information") is any information that relates to an identified or identifiable individual. We use "Personal Data" and "Personal Information" interchangeably unless a law uses a specific term.</li>
            <li><strong>Service</strong> refers to the Website.</li>
            <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</li>
            <li><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</li>
            <li><strong>Website</strong> refers to One Global Marketplace, accessible from <a href="https://www.oneglobalmarketplace.com" target="_blank" rel="noreferrer">https://www.oneglobalmarketplace.com</a>.</li>
            <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
          </ul>
        </Section>

        <Section id="section-1" title="Collecting and Using Your Personal Data">
          <h3 className="pp-h3">Types of Data Collected</h3>

          <h4 className="pp-h4">Personal Data</h4>
          <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
          <ul className="pp-list">
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Phone number</li>
          </ul>

          <h4 className="pp-h4">Usage Data</h4>
          <p>Usage Data is collected automatically when using the Service.</p>
          <p>Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
          <p>When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device's unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.</p>
          <p>We may also collect information that Your browser sends whenever You visit Our Service or when You access the Service by or through a mobile device.</p>
        </Section>

        <Section id="section-2" title="Tracking Technologies and Cookies">
          <p>We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies We use include beacons, tags, and scripts to collect and track information and to improve and analyze Our Service. The technologies We use may include:</p>
          <ul className="pp-list">
            <li><strong>Cookies or Browser Cookies.</strong> A cookie is a small file placed on Your Device. You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service.</li>
            <li><strong>Web Beacons.</strong> Certain sections of our Service and our emails may contain small electronic files known as web beacons (also referred to as clear gifs, pixel tags, and single-pixel gifs) that permit the Company to count users who have visited those pages or opened an email and for other related website statistics.</li>
          </ul>
          <p>Cookies can be "Persistent" or "Session" Cookies. Persistent Cookies remain on Your personal computer or mobile device when You go offline, while Session Cookies are deleted as soon as You close Your web browser.</p>
          <p>Where required by law, we use non-essential cookies (such as analytics, advertising, and remarketing cookies) only with Your consent. You can withdraw or change Your consent at any time using Our cookie preferences tool (if available) or through Your browser/device settings.</p>

          <div className="pp-cookie-grid">
            <CookieCard
              title="Necessary / Essential Cookies"
              type="Session Cookies"
              admin="Us"
              purpose="These Cookies are essential to provide You with services available through the Website and to enable You to use some of its features. They help to authenticate users and prevent fraudulent use of user accounts."
            />
            <CookieCard
              title="Cookies Policy / Notice Acceptance"
              type="Persistent Cookies"
              admin="Us"
              purpose="These Cookies identify if users have accepted the use of cookies on the Website."
            />
            <CookieCard
              title="Functionality Cookies"
              type="Persistent Cookies"
              admin="Us"
              purpose="These Cookies allow Us to remember choices You make when You use the Website, such as remembering your login details or language preference."
            />
          </div>
        </Section>

        <Section id="section-3" title="Use of Your Personal Data">
          <p>The Company may use Personal Data for the following purposes:</p>
          <ul className="pp-list">
            <li><strong>To provide and maintain our Service,</strong> including to monitor the usage of our Service.</li>
            <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</li>
            <li><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for products, items or services You have purchased.</li>
            <li><strong>To contact You</strong> by email, telephone calls, SMS, or other equivalent forms of electronic communication regarding updates or informative communications related to the Service.</li>
            <li><strong>To provide You with news, special offers,</strong> and general information about other goods, services and events which We offer that are similar to those that you have already purchased or inquired about.</li>
            <li><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</li>
            <li><strong>For business transfers:</strong> We may use Your Personal Data to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets.</li>
            <li><strong>For other purposes:</strong> such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Service.</li>
          </ul>

          <p>We may share Your Personal Data in the following situations:</p>
          <ul className="pp-list">
            <li><strong>With Service Providers:</strong> We may share Your Personal Data with Service Providers to monitor and analyze the use of our Service.</li>
            <li><strong>For business transfers:</strong> We may share or transfer Your Personal Data in connection with any merger, sale of Company assets, financing, or acquisition.</li>
            <li><strong>With Affiliates:</strong> We may share Your Personal Data with Our affiliates, requiring them to honor this Privacy Policy.</li>
            <li><strong>With business partners:</strong> We may share Your Personal Data with Our business partners to offer You certain products, services or promotions.</li>
            <li><strong>With Your consent:</strong> We may disclose Your Personal Data for any other purpose with Your consent.</li>
          </ul>
        </Section>

        <Section id="section-4" title="Retention of Your Personal Data">
          <p>The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our legal agreements and policies.</p>
          <p>Where possible, We apply shorter retention periods and/or reduce identifiability by deleting, aggregating, or anonymizing data.</p>

          <div className="pp-retention-table">
            <div className="pp-retention-header">
              <span>Data Category</span>
              <span>Retention Period</span>
            </div>
            <RetentionRow label="User Accounts" period="Duration of account + up to 24 months after closure" />
            <RetentionRow label="Customer Support Tickets" period="Up to 24 months from ticket closure" />
            <RetentionRow label="Chat Transcripts" period="Up to 24 months" />
            <RetentionRow label="Website Analytics & Cookies" period="Up to 24 months from collection" />
            <RetentionRow label="Server Logs (IP, access times)" period="Up to 24 months" />
          </div>

          <p style={{ marginTop: 20 }}>We may retain Personal Data beyond the periods stated above for legal obligations, to establish or defend legal claims, at your explicit request, or due to technical backup limitations.</p>
          <p>When retention periods expire, We securely delete or anonymize Personal Data. Residual copies may remain in encrypted backups for a limited period and are not restored except where necessary for security, disaster recovery, or legal compliance.</p>
        </Section>

        <Section id="section-5" title="Transfer of Your Personal Data">
          <p>Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ from those from Your jurisdiction.</p>
          <p>Where required by applicable law, We will ensure that international transfers of Your Personal Data are subject to appropriate safeguards and supplementary measures. The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to an organization or country unless there are adequate controls in place.</p>
        </Section>

        <Section id="section-6" title="Delete Your Personal Data">
          <p>You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.</p>
          <p>Our Service may give You the ability to delete certain information about You from within the Service. You may update, amend, or delete Your information at any time by signing in to Your Account and visiting the account settings section that allows you to manage Your personal information.</p>
          <p>Please note, however, that We may need to retain certain information when we have a legal obligation or lawful basis to do so.</p>
        </Section>

        <Section id="section-7" title="Disclosure of Your Personal Data">
          <h3 className="pp-h3">Business Transactions</h3>
          <p>If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.</p>

          <h3 className="pp-h3">Law Enforcement</h3>
          <p>Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).</p>

          <h3 className="pp-h3">Other Legal Requirements</h3>
          <p>The Company may disclose Your Personal Data in the good faith belief that such action is necessary to:</p>
          <ul className="pp-list">
            <li>Comply with a legal obligation</li>
            <li>Protect and defend the rights or property of the Company</li>
            <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
            <li>Protect the personal safety of Users of the Service or the public</li>
            <li>Protect against legal liability</li>
          </ul>
        </Section>

        <Section id="section-8" title="Security of Your Personal Data">
          <p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially reasonable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>
        </Section>

        <Section id="section-9" title="Children's Privacy">
          <p>Our Service does not address anyone under the age of 16. We do not knowingly collect personally identifiable information from anyone under the age of 16. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us.</p>
          <p>If We become aware that We have collected Personal Data from anyone under the age of 16 without verification of parental consent, We take steps to remove that information from Our servers.</p>
        </Section>

        <Section id="section-10" title="Links to Other Websites">
          <p>Our Service may contain links to other websites that are not operated by Us. If You click on a third party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit.</p>
          <p>We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.</p>
        </Section>

        <Section id="section-11" title="Changes to this Privacy Policy">
          <p>We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>
          <p>We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the "Last updated" date at the top of this Privacy Policy. You are advised to review this Privacy Policy periodically for any changes.</p>
        </Section>

        {/* ── Contact ── */}
        <div className="pp-contact" id="section-12">
          <div className="pp-contact-icon">✉</div>
          <h2 className="pp-h2" style={{ marginBottom: 8 }}>Contact Us</h2>
          <p style={{ margin: "0 0 16px" }}>If you have any questions about this Privacy Policy, you can reach us:</p>
          <a
            href="https://www.oneglobalmarketplace.com/contact"
            target="_blank"
            rel="noreferrer"
            className="pp-contact-link"
          >
            Visit our Contact Page →
          </a>
        </div>

      </div>
    </div>
  );
}