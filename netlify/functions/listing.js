const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Extract listing ID from path: /listings/{id}
    const pathParts = event.path.split('/');
    const listingId = pathParts[pathParts.length - 1];

    if (!listingId || Number.isNaN(Number(listingId))) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid listing ID' }) };
    }

    // GET - Get single listing
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', Number(listingId))
        .single();

      if (error) {
        return { statusCode: 404, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 200, body: JSON.stringify({ listing: data }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};