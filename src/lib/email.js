import { Resend } from 'resend';
import { supabaseAdmin } from './supabase-admin.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'TechBidly <notifications@techbidly.com>';

async function dispatch(userId, subject, html) {
  if (!resend) return;

  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = authData?.user?.email;
  if (!email) return;

  // Respect email_alerts preference if the column exists; default to sending
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email_alerts')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.email_alerts === false) return;

  try {
    await resend.emails.send({ from: FROM, to: email, subject, html });
  } catch (err) {
    console.error('Email dispatch error:', err.message);
  }
}

export const emailNotify = {
  bidPlaced(userId, listingTitle, amount) {
    return dispatch(
      userId,
      `Bid placed: ${listingTitle}`,
      `<p>Your bid of <strong>$${Number(amount).toLocaleString()}</strong> on <em>${listingTitle}</em> was placed successfully.</p>`
    );
  },

  outbid(userId, listingTitle, newAmount) {
    return dispatch(
      userId,
      `You've been outbid: ${listingTitle}`,
      `<p>Someone bid <strong>$${Number(newAmount).toLocaleString()}</strong> on <em>${listingTitle}</em>. Place a higher bid to stay in the running.</p>`
    );
  },

  listingPosted(userId, listingTitle) {
    return dispatch(
      userId,
      `Your listing is live: ${listingTitle}`,
      `<p>Your auction <em>${listingTitle}</em> is now live on TechBidly. You'll be notified when bids come in.</p>`
    );
  },

  auctionWon(userId, listingTitle, amount) {
    return dispatch(
      userId,
      `You won: ${listingTitle}`,
      `<p>Congratulations! You won <em>${listingTitle}</em> with a winning bid of <strong>$${Number(amount).toLocaleString()}</strong>. Payment has been processed and the seller will be in touch shortly.</p>`
    );
  },

  auctionLost(userId, listingTitle) {
    return dispatch(
      userId,
      `Auction ended: ${listingTitle}`,
      `<p>The auction for <em>${listingTitle}</em> has ended and you were outbid. Browse more listings on TechBidly.</p>`
    );
  },

  purchaseConfirmed(userId, itemTitle, total) {
    return dispatch(
      userId,
      `Order confirmed: ${itemTitle}`,
      `<p>Your purchase of <em>${itemTitle}</em> for <strong>$${Number(total).toLocaleString()}</strong> is confirmed. The seller will arrange shipping.</p>`
    );
  },
};
