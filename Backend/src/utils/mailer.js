const nodemailer = require('nodemailer');

// Configura el transporte SMTP usando las variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendResetPasswordEmail = async (recipientEmail, resetToken) => {
  const resetLink = `192.168.1.4:8070/reset-password?token=${resetToken}`;
  console.log(recipientEmail, resetLink);

  const mailOptions = {
    from: '"Mi Aplicación" <postmaster@sandbox872b33bad2ab4ead887b4d2a23dbbd0d.mailgun.org>',
    to: recipientEmail,
    subject: 'Recuperación de contraseña',
    html: `
      <p>Has solicitado recuperar tu contraseña.</p>
      <p>Haz click en el siguiente enlace para resetearla:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Este enlace expirará en 30 minutos.</p>
    `,
  };

  // Envía el correo
  return transporter.sendMail(mailOptions);
};