const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

// Environment variables for LND connection
const MACAROON = process.env.MACAROON;
const HOST = process.env.HOST;

// Create an axios instance for LND API calls
const lnd = axios.create({
   baseURL: `https://${HOST}:8080`,
   headers: {
      "Content-Type": "application/json",
      "Grpc-Metadata-Macaroon": MACAROON,
   },
});

// INFO METHODS

// https://lightning.engineering/api-docs/api/lnd/lightning/get-info
const getInfo = async () => {
   try {
      const response = await lnd.get("/v1/getinfo");
      console.log('GetInfo Response:', JSON.stringify(response.data, null, 2));
      return response.data;
   } catch (error) {
      console.error(
         "Error fetching LND info:",
         error.response ? error.response.data : error.message,
      );
      throw error;
   }
};

// INVOICE METHODS

// https://lightning.engineering/api-docs/api/lnd/lightning/list-invoices
const listInvoices = async () => {
   try {
      // Returns a list of all invoices from the node
      const response = await lnd.get("/v1/invoices");
      console.log('ListInvoices Response:', JSON.stringify(response.data, null, 2));
      return response.data;
   } catch (error) {
      console.error(
         "Error listing invoices:",
         error.response ? error.response.data : error.message,
      );
      throw error;
   }
}

// https://lightning.engineering/api-docs/api/lnd/lightning/lookup-invoice
const lookupInvoice = async (rHashStr) => {
   try {
      // Convert from base64 to hex if needed
      const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(rHashStr);
      const hexHash = isBase64 
         ? Array.from(atob(rHashStr), c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
         : rHashStr;

      const response = await lnd.get(`/v1/invoice/${hexHash}`);
      console.log('LookupInvoice Response:', JSON.stringify(response.data, null, 2));
      return response.data;
   } catch (error) {
      console.error(
         "Error looking up invoice:",
         error.response ? error.response.data : error.message,
      );
      throw error;
   }
}

// https://lightning.engineering/api-docs/api/lnd/lightning/add-invoice/index.html
const addInvoice = async (amount) => {
   try {
      const response = await lnd.post("/v1/invoices", {
         value: amount,
      });
      console.log('AddInvoice Response:', JSON.stringify(response.data, null, 2));
      return response.data;
   } catch (error) {
      console.error(
         "Error creating invoice:",
         error.response ? error.response.data : error.message,
      );
      throw error;
   }
};

module.exports = { getInfo, listInvoices, lookupInvoice, addInvoice };