import type { Metadata } from "next";
import { ArrowLeft, Leaf, Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Support | JuiceWala (juicewala)",
  description:
    "Contact JuiceWala (juicewala / juice wala / जूसवाला) customer care for fresh juice orders and delivery support in Bhiwani.",
  keywords: [
    "juicewala contact",
    "juicewala customer support",
    "juice wala phone",
    "juicewala bhiwani customer care",
  ],
};

export default function ContactPage() {
  return (
    <main className="contact-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="JuiceWala home">
          <span className="brand-mark">
            <Leaf size={20} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </Link>
        <Link className="contact-back-link" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to the storefront
        </Link>
      </header>

      <section className="support-section">
        <div className="support-heading">
          <p className="eyebrow">JUICEWALA · CUSTOMER CARE</p>
          <h1>Need a hand?</h1>
          <p>
            If you get stuck while ordering or need help with an existing order,
            contact us using any of the options below.
          </p>
        </div>

        <div className="support-options">
          <a className="support-option" href="tel:+919896962782">
            <span className="support-icon">
              <Phone size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="support-label">Call us</span>
              <strong>+91 98969 62782</strong>
            </span>
          </a>
          <a
            className="support-option"
            href="https://wa.me/919896962782"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="support-icon">
              <MessageCircle size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="support-label">WhatsApp</span>
              <strong>Chat with support</strong>
            </span>
          </a>
          <a
            className="support-option"
            href="mailto:vivekmittal0404@gmail.com"
          >
            <span className="support-icon">
              <Mail size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="support-label">Email us</span>
              <strong>vivekmittal0404@gmail.com</strong>
            </span>
          </a>
        </div>

        <p className="support-note">
          When asking about an order, include the order number shown in your
          confirmation.
        </p>
      </section>

      <footer className="site-footer contact-footer">
        <Link className="brand footer-brand" href="/" aria-label="JuiceWala home">
          <span className="brand-mark">
            <Leaf size={18} aria-hidden="true" />
          </span>
          <span>JuiceWala</span>
        </Link>
        <p>Doorstep fresh juice delivery in Bhiwani (expanding across India soon).</p>
        <Link href="/">Return to the storefront</Link>
      </footer>
    </main>
  );
}
