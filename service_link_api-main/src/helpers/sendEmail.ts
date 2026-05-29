import config from "src/config";
import * as nodemailer from "nodemailer";
const SendMail = async function (to: string, subject: string, body: string) {
  // const params={
  //     host: config.MAIL_HOST,
  //     port: config.MAIL_PORT,
  //     secure: config.MAIL_SECURE, //true for 465 port, false for other ports
  //     auth: {
  //         user: config.MAIL_USER,
  //         pass: config.MAIL_PASSWORD
  //     },
  //     tls: {
  //         ciphers:'SSLv3'
  //     }
  // }
  // console.log(params);
  // const transporter = nodemailer.createTransport(params);

  // const mailOptions = {
  //     from: config.MAIL_FROM,
  //     to: to,
  //     subject: subject,
  //     text: '',
  //     html: body

  // };
  // transporter.sendMail(mailOptions, function (error, info) {
  //     if (error) {
  //         console.log(error);
  //     } else {
  //         console.log('Email sent: ' + info.response);
  //     }
  // });
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(config.MAIL_PASSWORD);
  const msg = {
    to: to,
    from: config.MAIL_FROM, // Use the email address or domain you verified above
    subject: subject,
    text: body,
    html: body,
  };
  console.log('subject',subject);
  sgMail
    .send(msg)
    .then(() => { }, error => {
      console.error(error);

      if (error.response) {
        console.error(error.response.body)
      }
    });
};

export {
  SendMail,
}