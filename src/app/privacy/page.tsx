export default function PrivacyPage() {
  return (
    <main className="content-page">
      <p className="kicker">Last updated June 22, 2026</p>
      <h1>Privacy Policy</h1>
      <p>This production template must be reviewed for your company, country, vendors, and actual retention settings before launch.</p>
      <h2>What we collect</h2>
      <p>We collect the information needed to create and deliver a VoiceGift: contact email, recipient first name, memories and messages you enter, your voice recording, generated lyrics and media, payment identifiers, consent records, security logs, and basic device or network information.</p>
      <h2>Why we process it</h2>
      <p>We process this information to verify voice ownership, generate the requested original song, process payment, deliver private links, prevent abuse, respond to revisions and support requests, and comply with legal obligations.</p>
      <h2>Voice data</h2>
      <p>Your voice recording is used only for the project you authorize. It is not sold, published as a reusable voice model, or used to train a general model by VoiceGift. Your media vendors must be contractually configured with equivalent restrictions.</p>
      <h2>Retention</h2>
      <p>Source recordings and generated assets are scheduled for automatic deletion after the configured retention period, currently 30 days. Users can request immediate deletion from their private project page. Payment and fraud records may be retained longer where legally required.</p>
      <h2>Processors and international transfers</h2>
      <p>Depending on configuration, processors may include Vercel, Supabase, PayPal, email delivery, abuse prevention, and AI media providers. Update this policy with the selected vendors, locations, and transfer mechanisms before production launch.</p>
      <h2>Your choices</h2>
      <p>You can disable a public share link and delete project data from the private project page. Add a working privacy contact address before launch for access, correction, objection, and deletion requests.</p>
      <h2>Children</h2>
      <p>Voice upload and consent are restricted to adults. The service is not intended for children to submit voice data.</p>
    </main>
  );
}
