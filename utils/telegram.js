const axios = require('axios').default;

function sendMessageTL (tokenBot, chatId, message) {
    axios.post(
        `https://api.telegram.org/bot${tokenBot}/sendMessage`,
        {
            chat_id: chatId,
            text: `Seccast : ${message}`
        }
        )
        .then(response => {
            // console.log('Message posted');
        })
        .catch(err => {
            // console.log('Error :', err);
        })
}

 module.exports = {
   'sendMessageTL': sendMessageTL
 };




