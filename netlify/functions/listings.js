const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // GET - List all active listings
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('ends_at', { ascending: true });

      if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 200, body: JSON.stringify({ listings: data ?? [] }) };
    }

    // POST - Create new listing
    if (event.httpMethod === 'POST') {
      const authHeader = event.headers.authorization;
      if (!authHeader) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const token = authHeader.replace('Bearer ', '');
      const userPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const userId = userPayload.sub;

      const body = JSON.parse(event.body);
      const { sellerHandle, form } = body;

      if (!form?.title || !form?.startingBid) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
      }

      const endsAt = new Date(Date.now() + Number(form.duration) * 24 * 3600 * 1000).toISOString();
      const parts = (form.location ?? '').split(',');
      const city = parts[0]?.trim() ?? '';
      const country = parts.slice(1).join(',').trim();

      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: userId,
          seller_handle: sellerHandle ?? 'Anonymous Seller',
          title: form.title,
          category: form.category,
          condition: form.condition,
          description: form.description,
          image_url: form.imageUrl || null,
          starting_bid: Number(form.startingBid),
          current_bid: Number(form.startingBid),
          ends_at: endsAt,
          city,
          country,
          bid_count: 0,
          featured: false,
          status: 'active',
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          auth: { status: 'unverified', fraudScore: 0, checks: [] },
          comparables: [],
        })
        .select()
        .single();

      if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 200, body: JSON.stringify({ listing: data }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};