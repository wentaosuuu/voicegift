import Link from "next/link";

export default function PaymentSuccessPage() {
  return <main className="content-page"><p className="kicker">Payment received</p><h1>Thank you.</h1><p>Your project page will update as the full song is generated. If this window was opened by PayPal, you can close it and return to VoiceGift.</p><Link className="button" href="/">Return home</Link></main>;
}
