// Cloudflare Pages Function to verify password
// Password is stored as PASSWORD environment variable in Cloudflare Pages secrets

export async function onRequestPost(context) {
    try {
        const { password } = await context.request.json();
        
        if (!password) {
            return new Response(
                JSON.stringify({ success: false, error: 'Password is required' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }

        const correctPassword = context.env.PASSWORD;
        
        if (!correctPassword) {
            console.error('PASSWORD not configured in environment');
            return new Response(
                JSON.stringify({ success: false, error: 'Password verification not configured' }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }

        if (password === correctPassword) {
            return new Response(
                JSON.stringify({ success: true }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        } else {
            return new Response(
                JSON.stringify({ success: false, error: 'Incorrect password' }),
                {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Failed to verify password' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

