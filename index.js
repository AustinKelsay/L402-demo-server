const express = require('express');
const crypto = require('crypto');
const app = express();
const port = 3000;
const sampleData = require('./sample_data.json');
const { addInvoice, lookupInvoice } = require('./lnd.js');

// Store for our mock macaroons and payments
const macaroonStore = new Map();
const preimageStore = new Map();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to check L402 authentication
const checkL402Auth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const macaroon = req.headers['l402-macaroon'];
    
    if (!authHeader || !macaroon) {
        return res.status(402).json({
            message: 'Payment Required',
            headers: {
                'WWW-Authenticate': 'L402',
                'L402-Invoice': 'Required',
                'L402-Macaroon': 'Required'
            }
        });
    }

    // Extract preimage from Authorization header
    const [scheme, preimage] = authHeader.split(' ');
    if (scheme !== 'L402') {
        return res.status(401).json({
            message: 'Invalid authorization scheme'
        });
    }

    try {
        // Verify the macaroon and preimage
        const isValid = await verifyL402(preimage, macaroon);
        if (!isValid) {
            return res.status(401).json({
                message: 'Invalid L402 credentials'
            });
        }
        next();
    } catch (error) {
        console.error('Error verifying L402:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Function to generate an invoice using LND method
async function generateInvoice(amount) {
    try {
        // Create real invoice using LND
        const invoiceResponse = await addInvoice(amount);
        
        // Store payment hash for later verification
        const paymentHash = invoiceResponse.r_hash;
        preimageStore.set(paymentHash, null); // We'll update this when payment is received
        
        return {
            paymentHash,
            invoice: invoiceResponse.payment_request,
            // Note: preimage will come from payment verification
        };
    } catch (error) {
        console.error('Error generating invoice:', error);
        throw error;
    }
}

// Helper function to generate mock macaroon
function generateMacaroon(paymentHash) {
    const macaroon = crypto.randomBytes(32).toString('hex');
    macaroonStore.set(macaroon, paymentHash);
    return macaroon;
}

// Add new function to verify payment
async function verifyPayment(paymentHash) {
    try {
        const invoice = await lookupInvoice(paymentHash);
        if (invoice.settled) {
            // Store the preimage from the settled payment
            preimageStore.set(paymentHash, invoice.r_preimage);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error verifying payment:', error);
        return false;
    }
}

// Update the request-access route to better match L402 specification
app.post('/api/request-access', async (req, res) => {
    try {
        const { productId } = req.body;
        const product = sampleData.products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Generate real invoice
        const { paymentHash, invoice } = await generateInvoice(product.price);
        const macaroon = generateMacaroon(paymentHash);

        // Return headers in L402 format
        res.status(402).json({
            message: 'Payment required',
            headers: {
                'WWW-Authenticate': `L402 token="${paymentHash}"`,
                'L402-Invoice': invoice,
                'L402-Macaroon': macaroon
            }
        });
    } catch (error) {
        console.error('Error in request-access:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update verifyL402 to check payment status
async function verifyL402(preimage, macaroon) {
    const paymentHash = macaroonStore.get(macaroon);
    if (!paymentHash) return false;
    
    // First verify if payment is settled
    const isPaymentSettled = await verifyPayment(paymentHash);
    if (!isPaymentSettled) return false;

    const storedPreimage = preimageStore.get(paymentHash);
    const storedPreimageHex = Buffer.from(storedPreimage, 'base64').toString('hex');
    if (!storedPreimage) return false;

    return storedPreimageHex === preimage;
}

// Protected route example
app.get('/api/protected-data', checkL402Auth, (req, res) => {
    res.json({
        success: true,
        data: sampleData.protected_data
    });
});

// Start server
app.listen(port, () => {
    console.log(`L402 demo server running on port ${port}`);
});
