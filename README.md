# L402 Lightning Network API Authentication Demo

This project demonstrates the implementation of L402, a Lightning Network-based authentication protocol for API access. It uses LND (Lightning Network Daemon) to handle Lightning Network payments and provides a simple Express.js server that protects API endpoints using L402 authentication.

## Overview

L402 is a protocol that enables pay-per-request API access using Lightning Network payments. This implementation includes:

- Lightning Network invoice generation
- Macaroon-based authentication
- Payment verification
- Protected API endpoints
- Sample product tiers

## Prerequisites

- Node.js (v20 or later)
- LND node with REST API access
- `.env` file with the following configuration:
  ```
  MACAROON=your_lnd_macaroon
  HOST=your_lnd_host
  ```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Configure your environment variables in `.env`
4. Start the server:
```bash
node index.js
```

## API Endpoints

### Request Access
- **POST** `/api/request-access`
- **Body**: `{ "productId": number }`
- Generates a Lightning invoice for the requested product tier
- Returns L402 authentication headers

### Protected Data
- **GET** `/api/protected-data`
- Requires valid L402 authentication
- Returns protected content

## Authentication Flow

1. Client requests access by calling `/api/request-access`
2. Server returns:
   - L402-Invoice: Lightning Network invoice
   - L402-Macaroon: Authentication token
   - WWW-Authenticate: Payment hash
3. Client pays the invoice
4. Client makes authenticated requests using:
   - Authorization header with payment preimage
   - L402-Macaroon header

## Example Usage

1. Request access:
```bash
curl -X POST http://localhost:3000/api/request-access \
  -H "Content-Type: application/json" \
  -d '{"productId": 1}'
```

2. Pay the returned invoice using a Lightning wallet

3. Access protected endpoint:
```bash
curl http://localhost:3000/api/protected-data \
  -H "Authorization: L402 <preimage>" \
  -H "L402-Macaroon: <macaroon>"
```

## Product Tiers

The demo includes two sample product tiers:
- Premium API Access (1000 sats)
- Basic API Access (500 sats)

## Security Considerations

- Macaroons are currently implemented as simple tokens
- Payment verification uses LND's built-in invoice lookup
- Production implementations should include additional security measures

## Dependencies

- express: Web server framework
- axios: HTTP client for LND API calls
- dotenv: Environment configuration
- crypto: For macaroon generation

## License

MIT

## Resources

- [L402 Protocol Specification](https://docs.lightning.engineering/the-lightning-network/l402)
- [LND API Documentation](https://lightning.engineering/api-docs/api/lnd/)
