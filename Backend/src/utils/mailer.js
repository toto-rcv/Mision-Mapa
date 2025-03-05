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
  const resetLink = `${process.env.FRONTEND_URL}/change-password?token=${resetToken}`;
  console.log(recipientEmail, resetLink);
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: recipientEmail,
    subject: 'Recuperación de contraseña',
    html: `
    <p>Has solicitado recuperar tu contraseña.</p>
    <p>Haz clic en el siguiente enlace para resetearla:</p>
    <a href="${resetLink}">Cliquee aqui para cambiar la contraseña</a>
    <p>Si el enlace no funciona, copia y pega la siguiente URL en tu navegador:</p>
    <p><strong>${resetLink}</strong></p>
    <p>Este enlace expirará en 30 minutos.</p>
    `,
  };

  // Envía el correo
  return transporter.sendMail(mailOptions);
};