import Link from "next/link";

export default function PaymentCancelledPage() {
  return <main className="content-page"><p className="kicker">No charge made</p><h1>Payment cancelled.</h1><p>Your free preview and project are still available from the private link sent to your email.</p><Link className="button" href="/">Return home</Link></main>;
}
