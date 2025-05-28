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
    
    // DEBUG: Log the received parameters
    console.log('=== DEBUG INFO ===');
    console.log('Service:', service);
    console.log('Type:', type);
    console.log('Query:', query);
    console.log('YOUTUBE_DE_VIEW exists:', !!process.env.YOUTUBE_DE_VIEW);
    console.log('YOUTUBE_DE_CHANNEL exists:', !!process.env.YOUTUBE_DE_CHANNEL);
    console.log('YOUTUBE_DE_VIEW value:', process.env.YOUTUBE_DE_VIEW ? 'Set' : 'Not set');
    console.log('YOUTUBE_DE_CHANNEL value:', process.env.YOUTUBE_DE_CHANNEL ? 'Set' : 'Not set');
    
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
          console.log('Using YOUTUBE_DE_VIEW for type:', type);
        } else if (type === 'channel' || type === 'video') {
          API_KEY = process.env.YOUTUBE_DE_CHANNEL;
          console.log('Using YOUTUBE_DE_CHANNEL for type:', type);
        } else {
          console.log('Invalid type parameter:', type);
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
    
    console.log('Final API_KEY exists:', !!API_KEY);
    console.log('==================');
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `API key not configured for ${service} ${type}`,
          debug: {
            service: service,
            type: type,
            hasYouTubeDeView: !!process.env.YOUTUBE_DE_VIEW,
            hasYouTubeDeChannel: !!process.env.YOUTUBE_DE_CHANNEL
          }
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
    
    console.log('Making API call to:', apiUrl.replace(API_KEY, '[API_KEY_HIDDEN]'));
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.log('YouTube API Error:', response.status, data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'YouTube API error', details: data })
      };
    }
    
    console.log('YouTube API Success - Items found:', data.items?.length || 0);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', message: error.message })
    };
  }
};
