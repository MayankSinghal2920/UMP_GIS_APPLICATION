const nodemailer = require('nodemailer');
require('dotenv').config();
const path = require('path');

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_SERVER_HOST,
//   port: process.env.SMTP_PORT,
//   secure: false,
// //   auth: {
// //     user: process.env.FROM_MAIL,
// //     pass: process.env.MAIL_PASSWORD
// //   }
// });

// async function sendOTP(subject, user, otp) {
//   const today = new Date();
//   const formattedDate = today.toLocaleDateString('en-GB');

//   const template = `
//   <html>
//     <body style="font-family:'Poppins', sans-serif;">
//       <div style="max-width:600px;margin:auto;background:#f4f4f4;padding:24px;border-radius:16px">
//         <div style="text-align:center">
//           <img src="cid:uniqueImageCID" />
//         </div>
//         <h2>Dear ${user.name},</h2>
//         <p>Your OTP is:</p>
//         <h1 style="color:#0F62FE">${otp}</h1>
//         <p>Valid till ${formattedDate}</p>
//         <p>Thanks,<br/>Team IRGVAP</p>
//       </div>
//     </body>
//   </html>
//   `;

//   const mailOptions = {
//     from: process.env.FROM_MAIL,
//     to: user.email,
//     subject,
//     html: template,
//     attachments: [
//       {
//         filename: 'logo.png',
//         path: 'src/client/image/logo.png',
//         cid: 'uniqueImageCID'
//       }
//     ]
//   };

//   await transporter.sendMail(mailOptions);
// }




const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
});

const logoPath = path.join(
  process.cwd(),
  'client',
  'image',
  'logo.png'
);


async function sendOTP(subject, user, otp) {
  await transporter.sendMail({
    from: process.env.FROM_MAIL,
    to: user.email,
    subject,
    html: `<h2>Your OTP: ${otp}</h2>`,
    attachments: [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: 'uniqueImageCID'
      }
    ]
  });
}





// const internalTransporter = nodemailer.createTransport({
//   host: process.env.SMTP_SERVER_HOST,
//   port: process.env.SMTP_PORT,
//   secure: false,
//   tls: { rejectUnauthorized: false }
// });

// /* EXTERNAL SMTP (Gmail / SES) */
// const externalTransporter = nodemailer.createTransport({
//   host: process.env.EXTERNAL_SMTP_HOST,
//   port: process.env.EXTERNAL_SMTP_PORT,
//   secure: false,
//   auth: {
//     user: process.env.EXTERNAL_SMTP_USER,
//     pass: process.env.EXTERNAL_SMTP_PASS
//   }
// });

// /* Choose transporter based on email domain */
// function getTransporter(email) {
//   return email.endsWith('@cris.org.in')
//     ? internalTransporter
//     : externalTransporter;
// }

// const logoPath = path.join(__dirname, '..', 'client', 'image', 'logo.png');

// async function sendOTP(subject, user, otp) {
//   const transporter = getTransporter(user.email);

//   return transporter.sendMail({
//     from: process.env.FROM_MAIL,
//     to: user.email,
//     subject,
//     html: `<h2>Hello ${user.name}</h2><p>Your OTP is <b>${otp}</b></p>`,
//     attachments: [
//       {
//         filename: 'logo.png',
//         path: logoPath,
//         cid: 'logo'
//       }
//     ]
//   });
// }

module.exports = { sendOTP };
