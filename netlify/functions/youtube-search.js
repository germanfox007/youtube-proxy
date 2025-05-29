exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    let query, type, service;
    
    // Handle both GET and POST requests
    if (event.httpMethod === 'GET') {
      query = event.queryStringParameters?.q;
      type = event.queryStringParameters?.type || 'search';
      service = event.queryStringParameters?.service || 'youtube';
    } else {
      const body = JSON.parse(event.body);
      query = body.query;
      type = body.type || 'search';
      service = body.service || 'youtube';
    }
    
    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query parameter is required' })
      };
    }
    
    let API_KEY;
    switch(service.toLowerCase()) {
      case 'youtube':
        // Choose API key based on the type of request
        if (type === 'search' || type === 'channel-search') {
          API_KEY = process.env.YOUTUBE_DE_VIEW;
        } else if (type === 'channel' || type === 'video') {
          API_KEY = process.env.YOUTUBE_DE_CHANNEL;
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid type parameter for YouTube' })
          };
        }
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid service parameter' })
        };
    }
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `API key not configured for ${service} ${type}`
        })
      };
    }
    
    let apiUrl;
    
    if (type === 'search') {
      apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`;
    } else if (type === 'channel') {
      apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${query}&key=${API_KEY}`;
    } else if (type === 'channel-search') {
      apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=channel&key=${API_KEY}`;
    } else if (type === 'video') {
      apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${query}&key=${API_KEY}`;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid type parameter' })
      };
    }
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'YouTube API error', details: data })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', message: error.message })
    };
  }
};
