const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Get user from auth header (Netlify Identity)
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Parse the JWT to get user ID (simplified - in production use proper verification)
    const token = authHeader.replace('Bearer ', '');
    const userPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = userPayload.sub;

    const { listingId, amount } = JSON.parse(event.body);

    if (!listingId || !amount) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing listingId or amount' }) };
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid bid amount' }) };
    }

    const { data, error } = await supabase.rpc('place_bid', {
      p_listing_id: Number(listingId),
      p_buyer_id: userId,
      p_amount: numericAmount,
    });

    if (error) {
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};