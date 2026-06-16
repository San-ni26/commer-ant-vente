// src/lib/email.ts
import nodemailer from 'nodemailer'

// Configuration du transporteur
const transporteur = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function envoyerEmailVerification(email: string, token: string) {
  const urlVerification = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verification?token=${token}`

  try {
    const info = await transporteur.sendMail({
      from: `"Commerce Vente" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Vérifiez votre adresse email - Commerce Vente',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .url { background: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏪 Commerce Vente</h1>
                <p>Vérification de votre adresse email</p>
              </div>
              <div class="content">
                <h2>Bienvenue !</h2>
                <p>Merci d'avoir créé un compte. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
                
                <div style="text-align: center;">
                  <a href="${urlVerification}" class="button">Vérifier mon email</a>
                </div>
                
                <p style="margin-top: 20px;">Ou copiez ce lien :</p>
                <p class="url">${urlVerification}</p>
                
                <p style="color: #666; font-size: 14px;">Ce lien expire dans 24 heures.</p>
              </div>
              <div class="footer">
                <p>© 2024 Commerce Vente. Tous droits réservés.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    console.log('✅ Email envoyé:', info.messageId)
    return info
  } catch (error) {
    console.error('❌ Erreur envoi email:', error)
    throw error
  }
}

export async function envoyerEmailReinitialisation(email: string, token: string) {
  const urlReinitialisation = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reinitialiser-mot-de-passe?token=${token}`

  try {
    const info = await transporteur.sendMail({
      from: `"Commerce Vente" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - Commerce Vente',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3182ce 0%, #31119b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: linear-gradient(135deg, #3182ce 0%, #31119b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .url { background: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏪 Commerce Vente</h1>
                <p>Réinitialisation de mot de passe</p>
              </div>
              <div class="content">
                <h2>Bonjour,</h2>
                <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
                
                <div style="text-align: center;">
                  <a href="${urlReinitialisation}" class="button" style="color: white;">Réinitialiser mon mot de passe</a>
                </div>
                
                <p style="margin-top: 20px;">Ou copiez ce lien :</p>
                <p class="url">${urlReinitialisation}</p>
                
                <p style="color: #666; font-size: 14px;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
              </div>
              <div class="footer">
                <p>© 2024 Commerce Vente. Tous droits réservés.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    console.log('✅ Email de réinitialisation envoyé:', info.messageId)
    return info
  } catch (error) {
    console.error('❌ Erreur envoi email réinitialisation:', error)
    throw error
  }
}