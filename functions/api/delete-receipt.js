// Cloudflare Pages Function to delete a receipt

export async function onRequestPost(context) {
    try {
        const requestData = await context.request.json();
        const { customerName, receiptIndex } = requestData;
        
        if (!customerName || receiptIndex === undefined) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }

        // Get the SHEETS_WEBHOOK_URL from environment variables
        const sheetsWebhookUrl = context.env.SHEETS_WEBHOOK_URL;
        
        if (!sheetsWebhookUrl) {
            return new Response(
                JSON.stringify({ error: 'SHEETS_WEBHOOK_URL not configured' }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }

        // Send delete request to Google Apps Script
        const response = await fetch(sheetsWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteReceipt',
                customerName: customerName,
                receiptIndex: receiptIndex
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete receipt: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        return new Response(JSON.stringify(result),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
                }
            }
        );
    } catch (error) {
        console.error('Error deleting receipt:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to delete receipt' }),
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

