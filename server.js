const express = require('express');
const axios = require('axios');
const {exit} = require('process');

const Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
const TRAIN_SIGNAL = new Gpio(21, 'out'); //use GPIO pin 4, and specify that it is output

// Read environment variables from .env file
require('dotenv').config();

const {WALLET_ID, ADMIN_KEY, INVOICE_KEY, PORT, API} = process.env;


if ((WALLET_ID === null || WALLET_ID === undefined || WALLET_ID === '') ||
  (ADMIN_KEY === null || ADMIN_KEY === undefined || ADMIN_KEY === '') ||
  (INVOICE_KEY === null || INVOICE_KEY === undefined || INVOICE_KEY === '') ||
  (PORT === null || PORT === undefined || PORT === '') ||
  (API === null || API === undefined || API === '')) {
  console.log('Please check your .env file and make sure WALLET_ID, ADMIN_KEY, INVOICE_KEY, PORT, and API are all set');
  exit();
}

console.log('----- Train Server Initialized');
console.log(`WALLET: ${WALLET_ID}\nADMIN: ${ADMIN_KEY}\nINVOICE: ${INVOICE_KEY}\nAPI: ${API}`);

const app = express();

// Sanity Check
app.get('/', (req, res, next) => {
  res.send(true);
});

// Get the details of the wallet
app.get('/wallet', async (req, res, next) => {
  try {
    let response = await axios({
      url: `${API}/api/v1/wallet`,
      headers: {"X-Api-Key": INVOICE_KEY},
      method: 'get',
    });

    return res.send({data: response.data, success: true});
  } catch (error) {
    return res.send({error: error, success: false, code: 1001})
  }
});

// Create an invoice
app.get('/makeInvoice', async (req, res, next) => {
  // Get an amount of Satoshis from the url query parameter
  const {amount} = req.query;

  // If that amount is not provided, return an error message
  if (amount === undefined || amount === null || amount === 0) {
    return res.send({error: 'Please specify an amount', code: 1000, success: false});
  }

  // Try to get an invoice from the server
  try {
    const response = await axios({
      url: `${API}/api/v1/payments`,
      method: 'post',
      headers: {"X-Api-Key": INVOICE_KEY},
      data: {
        amount,
        memo: 'test',
        out: false,
      }
    });

    const {payment_hash} = response.data;

    // Invoice was created successfully
    checkInvoice(payment_hash);

    // If the invoice is received, send back the data (JSON)
    return res.send(response.data);
  } catch (error) {

    // Otherwise catch the error and return it to the user
    console.log('ERROR');
    console.log(error);
    return res.send({error: error, success: false, code: 1001});
  }
});

app.get('/checkInvoice', async (req, res, next) => {
  // Get an amount of Satoshis from the url query parameter
  const {invoice} = req.query;

  // Try to get an invoice from the server
  try {
    let response = await checkInvoice(invoice);

    return res.send(response);
  } catch (error) {

    // Otherwise catch the error and return it to the user
    console.log('ERROR');
    console.log(error);
    return res.send({error: error, success: false, code: 1001});
  }
});

// Start the server on the provided port.
app.listen(PORT, () => {
  console.log(`Train is listening on port ${PORT}...`);
});



const DURATION = 1000;
let count = 0;
async function checkInvoice(paymentHash) {

  console.log(`CHECKING INVOICE: ${count++}`);

  try {
    let response = await axios({
      url: `${API}/api/v1/payments/${paymentHash}`,
      method: 'get',
      headers: {"X-Api-Key": INVOICE_KEY}
    });

    if (response.data.paid === false) {
      return setTimeout(() => checkInvoice(paymentHash), DURATION);
    } else {
      // WHEN IT IS RUN THE TRAIN
      startTrain();
    }

    return response.data;

  } catch (error) {
    console.log('THERE WAS AN ERROR');
    console.log(error);
  }
}



function startTrain() {
  console.log('TRAIN IS RUNNING');
  TRAIN_SIGNAL.writeSync(1);
  setTimeout(() => {
    console.log('TRAIN IS STOPPED');
    TRAIN_SIGNAL.writeSync(0)
  }, 5000);
}
