/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  // console.log('Booking tour with ID:', tourId);
  try {
    // 1) Get checkout session from API
    const response = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log('API response:', response.data);

    // 2) Redirect to Paystack checkout
    if (response.data.status === 'success') {
      const authorizationUrl = response.data.authorization_url;

      // Redirect the user to Paystack's payment page
      window.location.href = authorizationUrl;
    } else {
      showAlert('error', 'Something went wrong while initializing payment');
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message || 'An error occurred');
  }
};
